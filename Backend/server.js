// File: backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://127.0.0.1:27017/logisticsApp', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .then(() => {
      console.log('Connected to MongoDB');
    })
    .catch((err) => {
      console.error('Error connecting to MongoDB', err);
    });

// Schemas and Models
const UserSchema = new mongoose.Schema({
  name: String,
  phone: { type: String, unique: true },
  password: String,
});

const DriverSchema = new mongoose.Schema({
  name: String,
  phone: { type: String, unique: true },
  password: String,
  vehicleNumber: String,
  vehicleType: { type: String, enum: ['small van', 'semi truck', 'large truck', 'extra large truck'] },
  location: { type: { type: String, default: 'Point' }, coordinates: [Number] },
  available: { type: Boolean, default: true },
  currentBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
});

DriverSchema.index({ location: '2dsphere' });

const BookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
  pickupLocation: { type: { type: String, default: 'Point' }, coordinates: [Number] },
  dropoffLocation: { type: { type: String, default: 'Point' }, coordinates: [Number] },
  pickupLocationAddress: String,
  dropoffLocationAddress: String,
  vehicleType: String,
  estimatedCost: Number,
  duration: Number,
  status: {
    type: String,
    enum: [
      'requested', 'scheduled', 'accepted', 'going for pick up', 'order picked up',
      'en route for deliver', 'order delivered'
    ],
    default: 'requested'
  },
  paymentStatus: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  scheduledTime: { type: Date, default: null }, // New field for scheduling future bookings
});



// Add 2dsphere index to pickupLocation
BookingSchema.index({ pickupLocation: '2dsphere' });

const User = mongoose.model('User', UserSchema);
const Driver = mongoose.model('Driver', DriverSchema);
const Booking = mongoose.model('Booking', BookingSchema);

// Register User
app.post('/register/user', async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, phone, password: hashedPassword });
    await user.save();
    res.status(201).send('User registered successfully');
  } catch (error) {
    res.status(400).send('Error registering user: ' + error.message);
  }
});

// Register Driver
app.post('/register/driver', async (req, res) => {
  try {
    const { name, phone, password, vehicleNumber, vehicleType, lat, lng } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const driver = new Driver({
      name,
      phone,
      password: hashedPassword,
      vehicleNumber,
      vehicleType,
      location: { type: 'Point', coordinates: [lng, lat] },
    });
    await driver.save();
    res.status(201).send('Driver registered successfully');
  } catch (error) {
    res.status(400).send('Error registering driver: ' + error.message);
  }
});

// Login User or Driver
app.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });
    const driver = await Driver.findOne({ phone });

    if (!user && !driver) {
      return res.status(404).send('User or Driver not found');
    }

    const account = user || driver;
    const isPasswordValid = await bcrypt.compare(password, account.password);
    if (!isPasswordValid) {
      return res.status(401).send('Invalid password');
    }

    const token = jwt.sign({ id: account._id, role: user ? 'user' : 'driver' }, 'secretKey');
    res.status(200).json({ token });
  } catch (error) {
    res.status(400).send('Error logging in: ' + error.message);
  }
});



// Book a Vehicle with Driver Matching Algorithm and Payment
app.post('/book', async (req, res) => {
  try {
    const { userId, pickupLocation, dropoffLocation, vehicleType, pickupLocationAddress, dropoffLocationAddress } = req.body;

    // Calculate distance and duration between pickup and dropoff using OLA Maps API Distance Matrix
    const olaMapsUrl = `https://api.olamaps.io/routing/v1/distanceMatrix?origins=${pickupLocation.lat}%2C${pickupLocation.lng}&destinations=${dropoffLocation.lat}%2C${dropoffLocation.lng}&mode=driving&api_key=IoLVtPprKjF1v31llfIwBIUwdGbtywt6nAB8CUuG`;
    const olaResponse = await axios.get(olaMapsUrl);
    const { rows } = olaResponse.data;

    if (!rows || rows.length === 0 || rows[0].elements.length === 0 || rows[0].elements[0].status !== 'OK') {
      return res.status(404).send('No routes found');
    }

    const distance = rows[0].elements[0].distance;
    const duration = rows[0].elements[0].duration;

    // Estimate price with surge and regional multiplier
    const estimatedCost = estimatePrice(distance, vehicleType, duration, pickupLocation, dropoffLocation);

    // Create booking without driver assignment
    const booking = new Booking({
      userId,
      pickupLocation: { type: 'Point', coordinates: [pickupLocation.lng, pickupLocation.lat] },
      dropoffLocation: { type: 'Point', coordinates: [dropoffLocation.lng, dropoffLocation.lat] },
      pickupLocationAddress,
      dropoffLocationAddress,
      vehicleType,
      estimatedCost,
      duration,
      status: 'requested',
      driverId: null, 
    });
    await booking.save();

    res.status(201).json({ bookingId: booking._id, estimatedCost, duration });
  } catch (error) {
    console.error('Error booking vehicle:', error.message);
    res.status(400).send('Error booking vehicle: ' + error.message);
  }
});

// Update Driver's Live Location
app.post('/driver/liveLocation', async (req, res) => {
  try {
    const { driverId, lat, lng } = req.body;

    // Validate incoming data
    if (!driverId || !lat || !lng) {
      return res.status(400).send('Invalid input data');
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).send('Driver not found');
    }

    // Update driver's location in the database
    driver.location = { type: 'Point', coordinates: [lng, lat] };
    await driver.save();

    res.status(200).send('Driver location updated successfully');
  } catch (error) {
    console.error('Error updating driver live location:', error.message);
    res.status(400).send('Error updating driver live location: ' + error.message);
  }
});


// Get Driver's Location
app.get('/driver/location/:driverId', async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.driverId);
    if (!driver) {
      return res.status(404).send('Driver not found');
    }
    const { coordinates } = driver.location;
    res.status(200).json({ lat: coordinates[1], lng: coordinates[0] });
  } catch (error) {
    res.status(400).send('Error fetching driver location: ' + error.message);
  }
});

// Get Available Bookings for Drivers
app.get('/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find({ status: 'requested', driverId: null });
    res.status(200).json(bookings);
  } catch (error) {
    res.status(400).send('Error fetching bookings: ' + error.message);
  }
});

// Get Driver Jobs (Requested or Accepted)
app.get('/driver/jobs', async (req, res) => {
  try {
    const bookings = await Booking.find({
      status: { $in: ['requested', 'accepted', 'going for pick up', 'order picked up', 'en route for deliver', 'order delivered'] },
    }).populate('driverId');
    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching driver jobs:', error.message);
    res.status(400).send('Error fetching driver jobs: ' + error.message);
  }
});
app.get('/bookings/:bookingId', async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).send('Booking not found');
    }
    res.status(200).json(booking);
  } catch (error) {
    res.status(400).send('Error fetching booking: ' + error.message);
  }
});

// Get Available Jobs for Driver based on location and vehicle type
app.get('/availableJobs', async (req, res) => {
  try {
    const { lat, lng, vehicleType } = req.query;

    if (!lat || !lng || !vehicleType) {
      return res.status(400).send('Missing or invalid query parameters: lat, lng, and vehicleType are required');
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).send('Invalid latitude or longitude values');
    }

    const availableBookings = await Booking.find({
      status: 'requested',
      vehicleType: vehicleType,
      driverId: null,
      pickupLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: 50000,
        },
      },
    });

    res.status(200).json(availableBookings);
  } catch (error) {
    console.error('Error fetching available jobs:', error.message);
    res.status(400).send('Error fetching available jobs: ' + error.message);
  }
});

// Driver Accepts Booking
app.post('/acceptBooking', async (req, res) => {
  try {
    const { driverId, bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).send('Booking not found');
    }

    booking.driverId = driverId;
    booking.status = 'accepted'; // Update status to "accepted"
    await booking.save();

    await Driver.findByIdAndUpdate(driverId, { available: false, currentBooking: bookingId });

    res.status(200).json({ message: 'Booking accepted', booking });
  } catch (error) {
    res.status(400).send('Error accepting booking: ' + error.message);
  }
});

// Update Booking Status
app.post('/updateStatus', async (req, res) => {
  try {
    const { bookingId, status } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).send('Booking not found');
    }

    booking.status = status;
    await booking.save();

    res.status(200).json({ message: 'Booking status updated', booking });
  } catch (error) {
    res.status(400).send('Error updating booking status: ' + error.message);
  }
});

// Get Driver Location
app.get('/driver/location/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const driver = await Driver.findById(driverId);

    if (!driver) {
      return res.status(404).send('Driver not found');
    }

    const { coordinates } = driver.location;
    res.status(200).json({ lat: coordinates[1], lng: coordinates[0] });
  } catch (error) {
    console.error('Error fetching driver location:', error.message);
    res.status(400).send('Error fetching driver location: ' + error.message);
  }
});

// Utility functions
function estimatePrice(distance, vehicleType, duration, pickupLocation, dropoffLocation) {
  const distanceInKm = distance / 1000;
  let baseRate;

  switch (vehicleType) {
    case 'small van':
      baseRate = 10;
      break;
    case 'semi truck':
      baseRate = 15;
      break;
    case 'large truck':
      baseRate = 20;
      break;
    case 'extra large truck':
      baseRate = 25;
      break;
    default:
      baseRate = 10;
  }

  const demandRatio = 1.5;
  const surgeFactor = 1.2;
  const surgeMultiplier = 1 + (demandRatio - 1) * surgeFactor;
  const regionalMultiplier = 1.1;
  const trafficMultiplier = duration > 60 ? 1.2 : 1.0;
  const fuelPricePerLiter = 1.2;
  const fuelConsumptionPerKm = 0.15;
  const fuelCost = distanceInKm * fuelConsumptionPerKm * fuelPricePerLiter;
  const driverExperienceMultiplier = 1.0;
  const tollCost = pickupLocation.lat !== dropoffLocation.lat ? 5 : 0;

  const estimatedPrice = (
    (baseRate * distanceInKm * surgeMultiplier * regionalMultiplier * trafficMultiplier) +
    fuelCost +
    tollCost
  ) * driverExperienceMultiplier;

  return estimatedPrice;
}

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));