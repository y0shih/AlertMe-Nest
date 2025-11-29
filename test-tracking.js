const io = require('socket.io-client');

// Configuration
const SERVER_URL = 'https://alertme-nest.onrender.com'; // Change this to your server URL
const TRACKING_NAMESPACE = '/tracking';
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IjhwTzZKQ3dxV0F2NktvcTMiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2hpcWVtZGlibGR0dWRtemJpYm5yLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiIzNDM2ODA1NC04NTFmLTQ5MDItYWQ5Yi02NmE1MDc5Y2MxOGMiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY0NDA1MTU2LCJpYXQiOjE3NjQ0MDE1NTYsImVtYWlsIjoidHJvbmdwMTMzN0BnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoidHJvbmdwMTMzN0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfbnVtYmVyIjoiMTExMTExMTExIiwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiIzNDM2ODA1NC04NTFmLTQ5MDItYWQ5Yi02NmE1MDc5Y2MxOGMiLCJ1c2VyX3R5cGUiOiJzdGFmZiIsInVzZXJuYW1lIjoic3RhZmZ1c2VyIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NjQ0MDE1NTZ9XSwic2Vzc2lvbl9pZCI6IjViN2ZlNDUwLTZhNTAtNDRkOS04MTEwLTAwODY1ZjA3ZmIwMyIsImlzX2Fub255bW91cyI6ZmFsc2V9.QjO3fHyZbAvGhq1VrqC5rYN36QnVFR1U1hCInuv8EVM'; // Replace with a valid JWT token for a staff user

// Test coordinates (5 locations to jump through)
const testLocations = [
	{ lat: -6.2088, lng: 106.8456, name: 'Jakarta City Center' },
	{ lat: -6.2146, lng: 106.8451, name: 'Central Jakarta - Thamrin' },
	{ lat: -6.2215, lng: 106.8467, name: 'Kuningan Area' },
	{ lat: -6.2297, lng: 106.8397, name: 'Blok M' },
	{ lat: -6.2383, lng: 106.8351, name: 'Senayan Area' },
];

// Connect to the tracking namespace
const socket = io(`${SERVER_URL}${TRACKING_NAMESPACE}`, {
	auth: {
		token: AUTH_TOKEN, // Send JWT token for authentication
	},
	transports: ['websocket'],
});

// Track current location index
let currentLocationIndex = 0;
let updateInterval;

// Connection event handlers
socket.on('connect', () => {
	console.log('✅ Connected to tracking gateway');
	console.log(`📍 Socket ID: ${socket.id}`);
	console.log('\n🚀 Starting location updates...\n');

	// Start sending location updates
	startLocationUpdates();
});

socket.on('connect_error', (error) => {
	console.error('❌ Connection error:', error.message);
	console.log('\n💡 Make sure to:');
	console.log('1. Replace AUTH_TOKEN with a valid JWT token');
	console.log('2. Ensure your server is running');
	console.log('3. Check that the user has "staff" role');
});

socket.on('disconnect', (reason) => {
	console.log(`\n🔌 Disconnected: ${reason}`);
	if (updateInterval) {
		clearInterval(updateInterval);
	}
});

// Listen for coordinate updates from other users
socket.on('coordinateUpdate', (data) => {
	console.log(`📡 Received coordinate update:`, data);
});

// Listen for staff disconnection notifications
socket.on('staffDisconnected', (data) => {
	console.log(`👤 Staff disconnected:`, data);
});

// Function to send location update
function sendLocationUpdate() {
	const location = testLocations[currentLocationIndex];

	console.log(`📍 [${currentLocationIndex + 1}/5] Sending location: ${location.name}`);
	console.log(`   Coordinates: ${location.lat}, ${location.lng}`);

	// Emit the updateCoordinate event
	socket.emit('updateCoordinate', {
		lat: location.lat,
		lng: location.lng,
	});

	currentLocationIndex++;

	// If we've sent all locations, stop and disconnect
	if (currentLocationIndex >= testLocations.length) {
		console.log('\n✅ All locations sent!');
		console.log('🏁 Test complete. Disconnecting in 2 seconds...');

		setTimeout(() => {
			clearInterval(updateInterval);
			socket.disconnect();
			process.exit(0);
		}, 2000);
	}
}

// Start sending location updates every 3 seconds
function startLocationUpdates() {
	// Send first location immediately
	sendLocationUpdate();

	// Then send remaining locations every 3 seconds
	updateInterval = setInterval(() => {
		if (currentLocationIndex < testLocations.length) {
			sendLocationUpdate();
		}
	}, 3000);
}

// Handle script termination
process.on('SIGINT', () => {
	console.log('\n\n👋 Shutting down...');
	if (updateInterval) {
		clearInterval(updateInterval);
	}
	socket.disconnect();
	process.exit(0);
});

console.log('🔄 Attempting to connect to tracking gateway...');
console.log(`📡 Server: ${SERVER_URL}${TRACKING_NAMESPACE}\n`);
