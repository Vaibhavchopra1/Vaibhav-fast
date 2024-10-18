// File: src/components/UserDashboard.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UserDashboard.css';

const MAPMYINDIA_LICENSE_KEY = '5b9af0b781d64bcabc4a7c32e3033813'; // Replace with your MapmyIndia license key
const DRIVER_ID = '670d54ca5a225033fc303d81';

const UserDashboard = () => {
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(null);
  const [duration, setDuration] = useState(null);
  const [pickupCoordinates, setPickupCoordinates] = useState(null);
  const [dropoffCoordinates, setDropoffCoordinates] = useState(null);
  const [mapImageUrl, setMapImageUrl] = useState('');
  const [showBookingOption, setShowBookingOption] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [searchingDriver, setSearchingDriver] = useState(false);
  const [rideAccepted, setRideAccepted] = useState(false);
  const [driverDetails, setDriverDetails] = useState(null);
  const [orderStatus, setOrderStatus] = useState('');
  const [driverLocation, setDriverLocation] = useState(null);
  const [mapresultImageUrl, setMapresultImageUrl] = useState('');
  const [scheduledTime, setScheduledTime] = useState(null); // New state for scheduling time

  useEffect(() => {
    let driverInterval;
    if (searchingDriver) {
      driverInterval = setInterval(async () => {
        console.log('Searching for drivers...');
        try {
          const response = await axios.get('http://localhost:5000/driver/jobs');
          const availableBookings = response.data;
  
          // Check if any driver has accepted the booking
          const bookingId = localStorage.getItem('bookingId');
          const currentBooking = availableBookings.find(booking => booking._id === bookingId && booking.status === 'accepted');
  
          if (currentBooking) {
            console.log('Driver accepted the booking');
            setRideAccepted(true);
            setSearchingDriver(false);
            setDriverDetails(currentBooking.driver);
            setOrderStatus(currentBooking.status);
            clearInterval(driverInterval);
          }
        } catch (error) {
          console.error('Error searching for drivers:', error.message);
        }
      }, 5000);
    }
    return () => clearInterval(driverInterval);
  }, [searchingDriver]);

  useEffect(() => {
    let locationInterval;

    if (rideAccepted) {
      // Polling every 2 seconds to update the driver's location
      locationInterval = setInterval(async () => {
        try {
          const response = await axios.get(`http://localhost:5000/driver/location/670d54ca5a225033fc303d81`);
          const { lat, lng } = response.data;

          // Update driver's location state
          setDriverLocation({ lat, lng });
          updateMap(lat, lng);
        } catch (error) {
          console.error('Error fetching driver location:', error.message);
        }
      }, 2000); // 2-second interval

    }

    return () => clearInterval(locationInterval);
  }, [rideAccepted]);

  // Function to update the map with the driver's current location using OLA Maps Static API
  const updateMap = (lat, lng) => {
    const styleName = 'default-light-standard';
    const zoom = 15; // Adjust the zoom level as needed
    const width = 800; // Image width
    const height = 600; // Image height
    const format = 'png'; // Image format
    const markerColor = 'red'; // Marker color

    const url = `https://api.olamaps.io/tiles/v1/styles/${styleName}/static/${lng},${lat},${zoom}/${width}x${height}.${format}?marker=${lng},${lat}|${markerColor}|scale:0.9&api_key=IoLVtPprKjF1v31llfIwBIUwdGbtywt6nAB8CUuG`;

    setMapresultImageUrl(url);
  };

  useEffect(() => {
    let trackingInterval;
    if (rideAccepted && driverDetails) {
      trackingInterval = setInterval(async () => {
        console.log('Tracking driver location...');
        try {
          const response = await axios.get(`http://localhost:5000/driver/location/670d54ca5a225033fc303d81`);
          const { lat, lng } = response.data;
          generateTrackingMap(lat, lng);
        } catch (error) {
          console.error('Error tracking driver location:', error.message);
        }
      }, 5000);
    }
    return () => clearInterval(trackingInterval);
  }, [rideAccepted, driverDetails]);
  useEffect(() => {
    let statusInterval;
    if (rideAccepted) {
      statusInterval = setInterval(async () => {
        console.log('Polling for booking status updates...');
        try {
          const bookingId = localStorage.getItem('bookingId');
          const response = await axios.get(`http://localhost:5000/bookings/${bookingId}`);
          const currentBooking = response.data;
          
          if (currentBooking) {
            setOrderStatus(currentBooking.status);
          }
  
          if (currentBooking.status === 'order delivered') {
          setRideAccepted(false);
          setDriverDetails(null);
          setOrderStatus('');
          setSearchingDriver(false);
          setPickupLocation('');
          setDropoffLocation('');
          setVehicleType('');
          setEstimatedCost(null);
          setDuration(null);
          setPickupCoordinates(null);
          setDropoffCoordinates(null);
          setMapImageUrl('');
          setShowBookingOption(false);
          setPaymentMethod('');
          localStorage.removeItem('bookingId');
        }
        } catch (error) {
          console.error('Error checking booking status:', error.message);
        }
      }, 5000);
    }
    return () => clearInterval(statusInterval);
  }, [rideAccepted]);
  

  useEffect(() => {
    let statusInterval;
    if (rideAccepted && driverDetails) {
      statusInterval = setInterval(async () => {
        console.log('Checking booking status...');
        try {
          const bookingId = localStorage.getItem('bookingId');
          const response = await axios.get(`http://localhost:5000/driver/jobs`);
          const currentBooking = response.data.find(booking => booking._id === bookingId);
          
          if (currentBooking) {
            setOrderStatus(currentBooking.status);
          }
        } catch (error) {
          console.error('Error checking booking status:', error.message);
        }
      }, 5000);
    }
    return () => clearInterval(statusInterval);
  }, [rideAccepted, driverDetails]);
  
  const handleLocationSelect = async (address, type) => {
    try {
      console.log(`Fetching location for address: ${address}, type: ${type}`);
      const url = `https://api.olamaps.io/places/v1/geocode?address=${encodeURIComponent(address)}&language=English&api_key=IoLVtPprKjF1v31llfIwBIUwdGbtywt6nAB8CUuG`;
      console.log(`Request URL: ${url}`);
      const response = await axios.get(url);
      console.log('Response:', response.data);

      if (!response.data.geocodingResults || response.data.geocodingResults.length === 0) {
        throw new Error('No location data found for the given address.');
      }

      const { lat, lng } = response.data.geocodingResults[0].geometry.location;
      console.log(`Coordinates found: Latitude = ${lat}, Longitude = ${lng}`);

      if (type === 'pickup') {
        console.log('Setting pickup coordinates and location');
        setPickupCoordinates({ lat, lng });
        setPickupLocation(address);
      } else if (type === 'dropoff') {
        console.log('Setting dropoff coordinates and location');
        setDropoffCoordinates({ lat, lng });
        setDropoffLocation(address);
      }

      if (pickupCoordinates && dropoffCoordinates) {
        console.log('Both pickup and dropoff coordinates are set, generating map image');
        generateMapImage();
      }
    } catch (error) {
      console.error('Error fetching location data:', error.message);
      alert('Error fetching location data: ' + error.message);
    }
  };

  const handleGetEstimates = async () => {
    try {
      console.log('Starting estimate process');
      const response = await axios.post('http://localhost:5000/book', {
        userId: localStorage.getItem('userId'),
        pickupLocation: pickupCoordinates,
        dropoffLocation: dropoffCoordinates,
        vehicleType,
      });
      console.log('Estimates response:', response.data);
      setEstimatedCost(response.data.estimatedCost);
      setDuration(response.data.duration);
      setShowBookingOption(true);
      localStorage.setItem('bookingId', response.data.bookingId);
    } catch (error) {
      console.error('Error getting estimates:', error.message);
      alert('Error getting estimates: ' + error.message);
    }
  };

  const handleBooking = () => {
    if (!paymentMethod) {
      alert('Please select a payment method before booking.');
      return;
    }
    console.log('Starting booking process with payment method:', paymentMethod);
    alert('Booking successful! Searching for nearby drivers...');
    setSearchingDriver(true);
  };
  
  const generateMapImage = () => {
    console.log('Generating map image');
    const polyline = [
      [pickupCoordinates.lng, pickupCoordinates.lat],
      [dropoffCoordinates.lng, dropoffCoordinates.lat],
    ];
    const markers = [
      [pickupCoordinates.lng, pickupCoordinates.lat],
      [dropoffCoordinates.lng, dropoffCoordinates.lat],
    ];
    const url = `https://apis.mapmyindia.com/advancedmaps/v1/${MAPMYINDIA_LICENSE_KEY}/still_image_polyline?height=400&width=400&polyline=${JSON.stringify(polyline)}&color=#ff00f7&markers=${JSON.stringify(markers)}&markers_icon=https://img.icons8.com/dusk/25/000000/region-code.png`;
    console.log(`Map Image URL: ${url}`);
    setMapImageUrl(url);
  };

  const generateTrackingMap = (lat, lng) => {
    console.log('Generating tracking map');
    const url = `https://apis.mapmyindia.com/advancedmaps/v1/${MAPMYINDIA_LICENSE_KEY}/still_image?center=${lng},${lat}&zoom=15&height=400&width=400`;
    console.log(`Tracking Map Image URL: ${url}`);
    setMapImageUrl(url);
  };

  return (
    <div className="user-dashboard">
      <h2>User Dashboard</h2>
      {!rideAccepted ? (
        <>
          <div className="booking-form">
            <div>
              <label>Pickup Location:</label>
              <input
                type="text"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                onBlur={() => handleLocationSelect(pickupLocation, 'pickup')}
                placeholder="Enter pickup location"
              />
            </div>
            <div>
              <label>Dropoff Location:</label>
              <input
                type="text"
                value={dropoffLocation}
                onChange={(e) => setDropoffLocation(e.target.value)}
                onBlur={() => handleLocationSelect(dropoffLocation, 'dropoff')}
                placeholder="Enter dropoff location"
              />
            </div>
            <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} required>
              <option value="">Select Vehicle Type</option>
              <option value="small van">Small Van</option>
              <option value="semi truck">Semi Truck</option>
              <option value="large truck">Large Truck</option>
              <option value="extra large truck">Extra Large Truck</option>
            </select>
            <button onClick={handleGetEstimates}>Get Estimates</button>
            {estimatedCost && <p>Estimated Cost: INR {Math.round(estimatedCost)}</p>}
            {duration && <p>Estimated Duration: {Math.ceil(duration / 60)} mins</p>}
            {showBookingOption && (
              <div>
                <h3>Select Payment Method:</h3>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} required>
                  <option value="">Select Payment Method</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="netbanking">Net Banking</option>
                </select>
                <button onClick={handleBooking}>Book Now</button>
              </div>
            )}
          </div>
          
          <div className="map-container">
            {mapImageUrl && (
              <img src={mapImageUrl} alt="Route Map" style={{ height: '400px', width: '400px' }} />
            )}
          </div>
          {searchingDriver && (
            <div className="circular-progress">
              Looking for a driver...
            </div>
          )}
        </>
      ) : (
        <div className="ride-accepted">
          <h3>Ride accepted! The driver is on the way.</h3>
          <div className="order-status">
            <h4>Order Status: {orderStatus}</h4>
          </div>
          <div className="driver-info">
            <p>Driver Name: Vaibhav Chopra</p>
            <p>Vehicle Number: HR 26 AA 0001</p>
            <p>Pickup Location: {pickupLocation}</p>
            <p>Dropoff Location: {dropoffLocation}</p>
            <p>Estimated Cost: INR {Math.round(estimatedCost)}</p>
            <p>Estimated Duration: {Math.ceil(duration / 60)} mins</p>
          </div>
            <div className="tracking-container">
              <h3>Tracking Driver Location</h3>
              {mapresultImageUrl && (
                <img src={mapresultImageUrl} alt="Live Driver Location" style={{ height: '400px', width: '400px' }} />
              )}
            </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;