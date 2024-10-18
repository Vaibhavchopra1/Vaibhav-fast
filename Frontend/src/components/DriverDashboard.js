import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DriverDashboard.css';

const DRIVER_LOCATION = { lat: 30.6319, lng: 76.72551 }; // Hardcoded driver's current location
const VEHICLE_TYPE = 'small van'; // Hardcoded vehicle type for this driver
const DRIVER_ID = '670d54ca5a225033fc303d81';

const DriverDashboard = () => {
  const [availableJobs, setAvailableJobs] = useState([]);
  const [acceptedJob, setAcceptedJob] = useState(null);
  const [jobStatus, setJobStatus] = useState('');
  
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        console.log(`Fetching available jobs for driver at Latitude=${DRIVER_LOCATION.lat}, Longitude=${DRIVER_LOCATION.lng}, Vehicle Type=${VEHICLE_TYPE}`);
        const response = await axios.get('http://localhost:5000/availableJobs', {
          params: {
            lat: DRIVER_LOCATION.lat,
            lng: DRIVER_LOCATION.lng,
            vehicleType: VEHICLE_TYPE,
          },
        });
        console.log('Available jobs:', response.data);
        setAvailableJobs(response.data);
      } catch (error) {
        console.error('Error fetching jobs:', error.message);
      }
    };

    const intervalId = setInterval(fetchJobs, 5000); // Polling every 5 seconds
    return () => clearInterval(intervalId);
  }, []);
  useEffect(() => {
    const updateDriverLocation = async (latitude, longitude) => {
      if (!DRIVER_ID || !latitude || !longitude) {
        console.error('Invalid input data for updating location:', { driverId: DRIVER_ID, latitude, longitude });
        return;
      }

      try {
        const response = await axios.post('http://localhost:5000/driver/liveLocation', {
          driverId: DRIVER_ID,
          lat: latitude,
          lng: longitude,
        });
        console.log('Driver location updated successfully', response.data);
      } catch (error) {
        console.error('Error updating driver location:', error.message);
      }
    };

    const trackLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            console.log('Current position:', { latitude, longitude });
            updateDriverLocation(latitude, longitude);
          },
          (error) => {
            console.error('Error getting driver location:', error.message);
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 2000 }
        );
      } else {
        console.error('Geolocation is not supported by this browser.');
      }
    };

    // Start tracking location
    trackLocation();
  }, []);


  const handleAcceptJob = async (jobId) => {
    try {
      console.log(`Accepting job with ID: ${jobId}`);
      const response = await axios.post('http://localhost:5000/acceptBooking', {
        driverId: localStorage.getItem('driverId'),
        bookingId: jobId,
      });
      console.log('Job accepted successfully');
      setAcceptedJob(response.data.booking);
      setJobStatus('accepted');
      setAvailableJobs([]);
    } catch (error) {
      console.error('Error accepting job:', error.message);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      if (!acceptedJob) return;

      console.log(`Updating job status to: ${newStatus}`);
      await axios.post('http://localhost:5000/updateStatus', {
        driverId: localStorage.getItem('driverId'),
        bookingId: acceptedJob._id,
        status: newStatus,
      });
      console.log('Job status updated successfully');
      setJobStatus(newStatus);

      if (newStatus === 'order delivered') {
        setAcceptedJob(null);
        setJobStatus('');
      }
    } catch (error) {
      console.error('Error updating job status:', error.message);
    }
  };

  const handleNavigate = () => {
    if (jobStatus === 'going for pick up') {
      // Navigate to pickup location
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${DRIVER_LOCATION.lat},${DRIVER_LOCATION.lng}&destination=${acceptedJob.pickupLocation.coordinates[1]},${acceptedJob.pickupLocation.coordinates[0]}&travelmode=driving`,
        '_blank'
      );
    } else if (jobStatus === 'en route for deliver') {
      // Navigate to dropoff location
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${acceptedJob.pickupLocation.coordinates[1]},${acceptedJob.pickupLocation.coordinates[0]}&destination=${acceptedJob.dropoffLocation.coordinates[1]},${acceptedJob.dropoffLocation.coordinates[0]}&travelmode=driving`,
        '_blank'
      );
    }
  };

  return (
    <div className="driver-dashboard">
      <h2>Driver Dashboard</h2>
      {acceptedJob ? (
        <div className="accepted-job">
          <h3>Accepted Job Details</h3>
          <p>Pickup Location: Plaksha University, Mohali</p>
          <p>Dropoff Location: Chandigarh Railway Station</p>
          <p>Estimated Earnings: INR {(acceptedJob.estimatedCost ? (acceptedJob.estimatedCost * 0.9).toFixed(2) : 'N/A')}</p>
          <p>Estimated Duration: {acceptedJob.duration ? Math.ceil(acceptedJob.duration / 60) : 'N/A'} mins</p>
          <p>Customer Name: Chanakya Rao</p>
          <p>Order Status: {jobStatus}</p>
          <div className="job-actions">
            <h4>Change the Job Status here:</h4>
            {jobStatus === 'accepted' && (
              <button onClick={() => handleUpdateStatus('going for pick up')}>Go for Pickup</button>
            )}
            {jobStatus === 'going for pick up' && (
              <button onClick={() => handleUpdateStatus('order picked up')}>Order Picked Up</button>
            )}
            {jobStatus === 'order picked up' && (
              <button onClick={() => handleUpdateStatus('en route for deliver')}>En Route for Delivery</button>
            )}
            {jobStatus === 'en route for deliver' && (
              <button onClick={() => handleUpdateStatus('order delivered')}>Order Delivered</button>
            )}
          </div>
          <div className="navigation-actions">
            {['going for pick up', 'en route for deliver'].includes(jobStatus) && (
              <>
                <h4>Press here to get the route to Navigate:</h4>
                <button onClick={handleNavigate}>Navigate to {jobStatus === 'going for pick up' ? 'Pickup' : 'Dropoff'}</button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="available-jobs">
          <h3>Available Jobs</h3>
          {availableJobs.length === 0 ? (
            <p>No jobs available nearby...</p>
          ) : (
            <ul>
              {availableJobs.map((job) => (
                <li key={job._id} className="job-item">
                  <p>Estimated Earnings: INR {(job.estimatedCost * 0.9).toFixed(2)}</p>
                  <p>Estimated Duration: {Math.ceil(job.duration / 60)} mins</p>
                  <button onClick={() => handleAcceptJob(job._id)}>Accept Job</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;