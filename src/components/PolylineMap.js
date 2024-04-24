import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-polylinedecorator";
import * as d3 from "d3";
import * as turf from "@turf/turf"; // Import turf.js for calculating bearing

function calculateBearing(startPoint, endPoint) {
  const startLat = startPoint.lat * (Math.PI / 180);
  const startLng = startPoint.lng * (Math.PI / 180);
  const endLat = endPoint.lat * (Math.PI / 180);
  const endLng = endPoint.lng * (Math.PI / 180);

  const dLng = endLng - startLng;
  const y = Math.sin(dLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);
  let bearing = Math.atan2(y, x);
  bearing = bearing * (180 / Math.PI);
  bearing = (bearing + 360) % 360;
  return bearing;
}

function PolylineMap({ data }) {
  const mapRef = useRef(null);

  const birdName = "anser";
  const [trajectoryData, setTrajectoryData] = useState({});
  const [selectedBirdIDs, setSelectedBirdIDs] = useState([]);
  const [allBirdIDs, setAllBirdIDs] = useState([]);
  const fetchAllBirdIDs = useCallback(() => {
    const baseUrl = "http://localhost:5000";
    axios
      .get(`${baseUrl}/get_bird_ids?bird=${birdName}`)
      .then((response) => {
        if (Array.isArray(response.data)) {
          setAllBirdIDs(response.data);
          setSelectedBirdIDs([response.data[0]]); // Initially select the first bird ID
        } else {
          console.error("Error: Response data is not an array", response.data);
          setAllBirdIDs([]);
        }
      })
      .catch((error) => {
        console.error("Error fetching bird IDs", error);
        setAllBirdIDs([]);
      });
  }, [birdName]);

  const getTrajectoryData = () => {
    const baseUrl = "http://localhost:5000";
    const firstBirdID = selectedBirdIDs[0];
    axios
      .get(
        `${baseUrl}/get_trajectory_data?bird=${birdName}&birdID=${firstBirdID}`
      )
      .then((response) => {
        setTrajectoryData(response.data);
      })
      .catch((error) => {
        console.error("Error fetching trajectory data", error);
        setTrajectoryData({});
      });
  };

  const handleDropdownChange = (event) => {
    setSelectedBirdIDs([event.target.value]);
  };

  useEffect(() => {
    // Fetch all available bird IDs and populate the dropdown options
    fetchAllBirdIDs();
  }, [fetchAllBirdIDs]);

  useEffect(() => {
    if (selectedBirdIDs.length > 0) {
      getTrajectoryData();
    }
  }, [selectedBirdIDs, birdName]);

  useEffect(() => {
    if (!trajectoryData || Object.keys(trajectoryData).length === 0) return;

    // Initialize Leaflet map centered over North America
    var map = L.map(mapRef.current).setView([37.8, -96.9], 4); // Centered over North America
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const validData = trajectoryData.filter(
      (d) => !isNaN(d.LATITUDE) && !isNaN(d.LONGITUDE) && d.TIMESTAMP
    );

    if (validData.length === 0) {
      console.error("No valid trajectory data found.");
      return;
    }


  const latLngs = validData.map((d) => [
    parseFloat(d.LATITUDE),
    parseFloat(d.LONGITUDE),
  ]);

  // Create polyline and add it to the map with a specific color
  const polyline = L.polyline(latLngs, {
  }).addTo(map);

  // Calculate bearings for each segment of the polyline
  const bearings = [];
  for (let i = 0; i < latLngs.length - 1; i++) {
    const startPoint = L.latLng(latLngs[i]);
    const endPoint = L.latLng(latLngs[i + 1]);
    const bearing = calculateBearing(startPoint, endPoint);
    bearings.push(bearing);
  }

  // Create polyline decorator and add it to the map
  L.polylineDecorator(polyline, {
    patterns: bearings.map((bearing, index) => ({
      offset: 10,
      repeat: 150,
      symbol: L.Symbol.arrowHead({
        pixelSize: 8,
        polygon: false,
        pathOptions: { color: 'red' } // Customize arrow color if needed
      }),
      
    }))
  }).addTo(map);

    // Clean up map instance if component unmounts
    return () => {
      map.remove();
    };
  }, [trajectoryData]);

  return (
    <div>
      <select onChange={handleDropdownChange} value={selectedBirdIDs[0]}>
        <option value="">Select bird ID</option>
        {allBirdIDs.map((birdID) => (
          <option key={birdID} value={birdID}>
            {birdID}
          </option>
        ))}
      </select>
      <div ref={mapRef} style={{ width: "800px", height: "600px" }}>
        <span>This is a span element</span>
      </div>
    </div>
  );
}

export default PolylineMap;
