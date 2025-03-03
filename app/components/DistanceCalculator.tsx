
'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import { LeafletMouseEvent } from 'leaflet';
import polyline from '@mapbox/polyline'; // For polyline decoding
import { supabase } from '../../lib/supabaseClient'; // Import supabase client
import 'leaflet/dist/leaflet.css';
import styles from './styles/DistanceCalculator.module.css'; // Import the CSS module
import { getDistance } from 'geolib'; // This can help calculate the distance between two lat/lng coordinates in meters
import Link from 'next/link'; // Import Link from Next.js

// Define the types for the suggestion response
interface Location {
  lat: number;
  lng: number;
}

interface Prediction {
  description: string;
  geometry: {
    location: Location;
  };
}

interface SuggestionResponse {
  predictions: Prediction[];
}

interface Suggestion {
  description: string;
  latitude: number;
  longitude: number;
}

const DistanceCalculator = () => {
  const [origin, setOrigin] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [pickupDetails, setPickupDetails] = useState<string>(''); // Pickup Details
  const [dropDetails, setDropDetails] = useState<string>(''); // Drop Details
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [originSuggestions, setOriginSuggestions] = useState<Suggestion[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<Suggestion[]>([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState<boolean>(false);
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState<boolean>(false);
  const [distance, setDistance] = useState<string | null>(null);
  const [deliveryCharge, setDeliveryCharge] = useState<string | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<[number, number]>>([]);
  const [orderId, setOrderId] = useState<string | null>(null); // For storing the order ID
  const [showPopup, setShowPopup] = useState<boolean>(false); // For controlling the visibility of the popup
  
  // Coordinates for Manipur, India
  const manipurLocation = { lat: 24.817, lng: 93.936 };

  // Fetch user details from Supabase (specifically the address)
  const fetchUserDetails = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('Error fetching user details:', error);
      return null;
    }

    return user ? user.email : null; // You can replace 'user.email' with any other user property you need
  };

  // Set origin and destination to user's address fetched from Supabase
  const setSameAsMyAddressOrigin = async () => {
    const userAddress = await fetchUserDetails();
    if (userAddress) {
      setOrigin(userAddress); // Set origin to fetched address
      fetchSuggestions(userAddress, true); // Fetch suggestions for the address
    }
  };

  const setSameAsMyAddressDest = async () => {
    const userAddress = await fetchUserDetails();
    if (userAddress) {
      setDestination(userAddress); // Set destination to fetched address
      fetchSuggestions(userAddress, false); // Fetch suggestions for the address
    }
  };

  // Function to fetch suggestions for origin/destination
  const fetchSuggestions = async (input: string, isOrigin: boolean) => {
    try {
      // Fetch location suggestions from an API, biasing towards Manipur
      const response = await fetch(`/api/autocomplete?input=${input}&location=${manipurLocation.lat},${manipurLocation.lng}`);
      if (!response.ok) {
        console.error('Error fetching suggestions:', response.statusText);
        return;
      }

      const data: SuggestionResponse = await response.json();
      const suggestions = data.predictions.map((prediction) => ({
        description: prediction.description,
        latitude: prediction.geometry.location.lat,
        longitude: prediction.geometry.location.lng,
      }));

      if (isOrigin) {
        setOriginSuggestions(suggestions);
        setShowOriginSuggestions(true);
      } else {
        setDestinationSuggestions(suggestions);
        setShowDestinationSuggestions(true);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  // Ensure MapRedraw is defined properly before usage
  const MapRedraw = () => {
    const map = useMap();
    useEffect(() => {
      if (map) {
        map.invalidateSize();
      }
    }, [originCoords, destinationCoords, routeCoordinates, map]);
    return null;
  };

  // Function to calculate distance between origin and destination
  const calculateDistance = async () => {
    setDistance('Calculating...');
    if (!originCoords || !destinationCoords) {
      console.error('Both origin and destination coordinates are required');
      return;
    }

    const origin = `${originCoords.lat},${originCoords.lng}`;
    const destination = `${destinationCoords.lat},${destinationCoords.lng}`;

    try {
      const response = await fetch(`/api/distance-matrix?origin=${origin}&destination=${destination}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error fetching distance:', response.statusText, errorText);
        setDistance('Error calculating distance');
        return;
      }

      const data = await response.json();

      const distanceInMeters = data.rows[0].elements[0].distance;
      const distanceInKm = (distanceInMeters / 1000).toFixed(2); // Convert and round to 2 decimals
      setDistance(`${distanceInKm} km`);

      // Decode polyline for route display
      const routePolyline = data.rows[0].elements[0].polyline;
      const decodedPolyline = polyline.decode(routePolyline);
      setRouteCoordinates(decodedPolyline);

      // Calculate delivery charge based on the distance
      calculateDeliveryCharge(distanceInKm);
    } catch (error) {
      console.error('Fetch error:', error);
      setDistance('Error calculating distance');
    }
  };

  const calculateDistanceFromCenter = (coords: { lat: number; lng: number }) => {
    return getDistance(manipurLocation, coords) / 1000; // Returns distance in kilometers
  };
  
  const calculateDeliveryCharge = (distanceInKm: string) => {
    const distance = parseFloat(distanceInKm);
    
    // Calculate distance from center for both origin and destination
    const originDistanceFromCenter = originCoords ? calculateDistanceFromCenter(originCoords) : 0;
    const destinationDistanceFromCenter = destinationCoords ? calculateDistanceFromCenter(destinationCoords) : 0;
  
    // Calculate charge based on distance
    let charge = 0;
  
    if (distance < 10) {
      // ₹27 base charge + ₹10 per km for distances lower than 10 km
      charge = 27 + (distance * 10);
    } else if (distance >= 10 && distance <= 30) {
      // ₹10 per km for distances between 10 km and 30 km
      charge = distance * 10;
    } else {
      // ₹7 per km for distances greater than 30 km
      charge = distance * 8;
    }
  
    // If both origin and destination are within 5 km radius of Manipur, but charge exceeds ₹100, cap the charge at ₹100
    if (originDistanceFromCenter <= 4.5 && destinationDistanceFromCenter <= 4.5 && charge > 100) {
      setDeliveryCharge("₹120");
    } else {
      // Otherwise, show the calculated charge
      setDeliveryCharge(`₹${charge.toFixed(2)}`);
    }
  };
  
  // Map click handler to capture origin/destination
  const MapClickHandler = () => {
    useMapEvents({
      click(e: LeafletMouseEvent) {
        const selectedCoords = { lat: e.latlng.lat, lng: e.latlng.lng };

        if (!originCoords) {
          setOriginCoords(selectedCoords);
          reverseGeocode(selectedCoords, setOrigin);
        } else {
          setDestinationCoords(selectedCoords);
          reverseGeocode(selectedCoords, setDestination);
        }
      },
    });
    return null;
  };

  // Reverse geocode to get the name of the place
  const reverseGeocode = async (
    coords: { lat: number; lng: number },
    setLocation: (name: string) => void
  ) => {
    try {
      const response = await fetch(`/api/reverse-geocode?lat=${coords.lat}&lng=${coords.lng}`);
      const data = await response.json();
      setLocation(data.place_name || 'Selected Location');
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      setLocation('Selected Location');
    }
  };

  // Send data to Supabase
  const storeDataInSupabase = async () => {
    const { data, error } = await supabase
      .from('distance_calculations')
      .insert([
        {
          pickup_details: pickupDetails,
          drop_details: dropDetails,
          origin,
          destination,
          distance,
          delivery_charge: deliveryCharge,
          status: 'Pending',  // Default status
        },
      ])
      .select('id'); // Request the id to be returned after insertion
  
    if (error) {
      console.error('Error inserting data into Supabase:', error);
      return;
    }
  
    console.log('Data stored successfully:', data);
    const insertedId = data[0].id; // Assuming data[0] is the inserted row
    setOrderId(insertedId.toString()); // Store the order ID
    setShowPopup(true); // Show the popup after the data is successfully stored
  };

  // Send data to Telegram function
  const sendDataToTelegram = async () => {
    const botToken = '7975276224:AAHaPCFjzwm7XhR6_fcN7i8LRCXs9ZQ2iOI'; // Replace with your Telegram Bot Token
    const chatId = '956560646'; // Replace with your Telegram Chat ID
    
    const message = `
      Pickup Details: ${pickupDetails}
      Drop Details: ${dropDetails}
      Origin: ${origin}
      Destination: ${destination}
      Distance: ${distance}
      Delivery Charge: ${deliveryCharge}
    `;
    
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
        }),
      });

      if (response.ok) {
        console.log('Message sent to Telegram');
      } else {
        console.error('Error sending message to Telegram');
        alert('Failed to send message');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to send message');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.inputSection}>
        <div className={styles.inputGroup}>
          <label>Pickup Details</label>
          {/* <textarea
            value={pickupDetails}
            onChange={(e) => setPickupDetails(e.target.value)}
            className={styles.textarea}
            placeholder="Enter pickup details(Name, Phone)"
          /> */}
        
        <div className={styles.inputGroup}>
          <input
            type="text"
            value={origin}
            onChange={(e) => {
              setOrigin(e.target.value);
              fetchSuggestions(e.target.value, true); // Pass 'true' for origin
            }}
            className={styles.input}
            placeholder="Enter Pickup Address"
            />
          {showOriginSuggestions && (
            <ul className={styles.suggestionsList}>
              {originSuggestions.map((suggestion, index) => (
                <li
                key={index}
                className={styles.suggestionItem}
                onClick={() => {
                  setOrigin(suggestion.description);
                  setOriginCoords({
                    lat: suggestion.latitude,
                    lng: suggestion.longitude,
                  });
                  setShowOriginSuggestions(false);
                }}
                >
                  {suggestion.description}
                </li>
              ))}
            </ul>
          )}
          </div>
        </div>
        <div className={styles.inputGroup}>
          <label>Drop Details</label>
          {/* <textarea
            value={dropDetails}
            onChange={(e) => setDropDetails(e.target.value)}
            className={styles.textarea}
            placeholder="Enter drop details(Name, Phone)"
          /> */}

        <div className={styles.inputGroup}>
          <input
            type="text"
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              fetchSuggestions(e.target.value, false); // Pass 'false' for destination
            }}
            className={styles.input}
            placeholder="Enter drop details"
            />
          {showDestinationSuggestions && (
            <ul className={styles.suggestionsList}>
              {destinationSuggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className={styles.suggestionItem}
                  onClick={() => {
                    setDestination(suggestion.description);
                    setDestinationCoords({
                      lat: suggestion.latitude,
                      lng: suggestion.longitude,
                    });
                    setShowDestinationSuggestions(false);
                  }}
                >
                  {suggestion.description}
                </li>
              ))}
            </ul>
          )}
          </div>
        </div>


        <button onClick={calculateDistance} className={styles.button}>
          Calculate Fare
        </button>
        
        {distance && <p className={styles.distance}>Distance: {distance}</p>}
        {deliveryCharge && <p className={styles.deliveryCharge}>Delivery Fare: {deliveryCharge}</p>}

        {/* <button onClick={() => {
          storeDataInSupabase();  // Store data in Supabase
          sendDataToTelegram();  // Send data to Telegram
        }} className={styles.button}>
          Confirm Order
        </button> */}
        <br /><br />
        {/* <h3 className={styles.heading}>Please calculate the fare and confirm your booking. For standard orders, click the link below.</h3> */}
        <div>
        <Link href="/standard.pdf" className={styles.links} style={{color: '#71f386', textDecoration: "underline"}}>Standard delivery rates.</Link>
      </div>
      </div>

      <div className={styles.mapContainer}>
        <MapContainer
          center={[24.817, 93.936]} // Default to Manipur
          zoom={13}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler />
          <MapRedraw />
          {originCoords && <Marker position={[originCoords.lat, originCoords.lng]}>
            <Popup>{origin}</Popup>
          </Marker>}
          {destinationCoords && <Marker position={[destinationCoords.lat, destinationCoords.lng]}>
            <Popup>{destination}</Popup>
          </Marker>}
          {routeCoordinates.length > 0 && <Polyline positions={routeCoordinates} />}
        </MapContainer>
      </div>

      {/* Popup */}
      {showPopup && orderId && (
        <div className={styles.popup}>
          <div className={styles.popupContent}>
            <h2>Order ID: {orderId}</h2>
            <p>Your order is in pending status.</p>

            <button className={styles.closeButton} onClick={() => setShowPopup(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DistanceCalculator;
