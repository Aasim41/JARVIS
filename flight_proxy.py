import sys
import json
from FlightRadar24 import FlightRadar24API

def get_flight_status(flight_query):
    try:
        fr_api = FlightRadar24API()
        # Search for flight by query (flight number or callsign)
        flights = fr_api.get_flights()
        
        target_flight = None
        flight_query_upper = flight_query.upper().replace(' ', '')
        
        for flight in flights:
            if (flight.number and flight_query_upper in flight.number.upper().replace(' ', '')) or \
               (flight.callsign and flight_query_upper in flight.callsign.upper().replace(' ', '')):
                target_flight = flight
                break
                
        if not target_flight:
            print(json.dumps({"error": f"Flight {flight_query} not currently found in active airspace."}))
            return

        details = fr_api.get_flight_details(target_flight)
        
        # Extract essential data to prevent massive JSON output
        essential_data = {
            "flight_number": target_flight.number or target_flight.callsign,
            "airline": target_flight.airline_name or "Unknown",
            "aircraft": target_flight.aircraft_code or "Unknown",
            "origin": target_flight.origin_airport_iata or "Unknown",
            "destination": target_flight.destination_airport_iata or "Unknown",
            "live_telemetry": {
                "altitude_ft": target_flight.altitude,
                "ground_speed_kts": target_flight.ground_speed,
                "heading": target_flight.heading,
                "latitude": target_flight.latitude,
                "longitude": target_flight.longitude,
                "on_ground": target_flight.on_ground == 1
            }
        }
        
        # Try to get schedule info from details
        if details and 'airport' in details:
            try:
                essential_data['scheduled_departure'] = details['airport']['origin']['timezone']['name']
                essential_data['status'] = details.get('status', {}).get('text', 'En Route')
            except:
                pass
                
        print(json.dumps(essential_data))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        get_flight_status(sys.argv[1])
    else:
        print(json.dumps({"error": "No flight number provided."}))
