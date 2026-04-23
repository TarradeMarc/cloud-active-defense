# Check if the decoy throw an error 500 once triggered

# Configure decoys
config=$(cat <<EOF
{
  "pa_id": "${PROTECTEDAPP_ID}",
  "decoy": {
    "decoy": {
      "key": "x-cloud-active-defense",
      "separator": "=",
      "value": "ACTIVE"
    },
    "detect": {
      "seek": {
        "inRequest": ".*",
        "in": "header" 
      },
      "alert": {
        "severity": "HIGH",
        "whenComplete": true
      }
    }
  }
}
EOF
)
# Configure global config
globalconfig=$(cat <<EOF
{
  "pa_id": "${PROTECTEDAPP_ID}",
  "config": {
    "respond": [{
      "source": "userAgent",
      "behavior": "error",
      "delay": "now",
      "duration": "5s"
    }],
    "blocklistReload": 1,
    "configReload": 1
  }
}
EOF
)
# Send the decoy configuration to the API
decoy_id=$(curl -X POST -s -H "Content-Type: application/json" -H "Authorization: Bearer $KEYCLOAK_TOKEN" -d "$config" http://localhost:8050/decoy | jq -r '.data.id')
echo "[LOG] Decoy created with ID: $decoy_id"
curl -X PATCH -s -H "Content-Type: application/json" -H "Authorization: Bearer $KEYCLOAK_TOKEN" -d "{\"id\": \"${decoy_id}\", \"deployed\": true}" http://localhost:8050/decoy/state > /dev/null
echo "[LOG] Decoy deployed"
# Send the global configuration to the API
curl -X PUT -s -H "Content-Type: application/json" -H "Authorization: Bearer $KEYCLOAK_TOKEN" -d "$globalconfig" http://localhost:8050/config > /dev/null
echo "[LOG] Global config sent"

# wait a few seconds for the proxy to read the new config
sleep 5


# Start timing
start_time=$(date +%s.%N)

# Temporary file for curl output
tempfile=$(bash ./uuidgen.sh)

# Call it once first to trigger the alert and get blocklisted
echo "[LOG] Triggering decoy with first request..."
curl -v -H "x-cloud-active-defense: ACTIVE" -s http://localhost:8000/ &>/dev/null
echo "[LOG] First request completed"

echo "[LOG] Checking if bloklisted before sleep"
curl -v http://localhost:8000/

# Wait a little before next request
sleep 3
# Do relevant action(s)
echo "[LOG] Making second request to check for 500 error..."
curl -v http://localhost:8000/ >$tempfile 2>&1
echo "[LOG] Second request completed"

# Check it was correctly sending error 500 (in $tempfile)
echo "[LOG] Checking response in tempfile..."
echo "[LOG] Response content:"
cat $tempfile
status=$(grep "500 Internal Server Error" $tempfile)

# Output result & time
if [ -z "$status" ]; then
  echo "[LOG] Status check: FAILED - No '500 Internal Server Error' found in response"
  echo -e "\033[0;31mFAIL\033[0m"
else
  echo "[LOG] Status check: PASSED - Found '500 Internal Server Error' in response"
  echo -e "\033[0;32mPASS\033[0m"
fi

check_1_time=$(date +%s.%N)
execution_time=$(echo "$check_1_time $start_time" | awk '{print $1 - $2}')
echo "Execution time: $execution_time seconds"

# Cleanup
rm $tempfile
curl -X DELETE -s -H "Authorization: Bearer $KEYCLOAK_TOKEN" http://localhost:8050/decoy/$decoy_id > /dev/null
curl -X PUT -s -H "Content-Type" -H "Authorization: Bearer $KEYCLOAK_TOKEN" -d "{\"pa_id\": "$PROTECTEDAPP_ID", \"config\": {}}" http://localhost:8050/config/$config_id > /dev/null
