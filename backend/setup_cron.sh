#!/bin/bash
# Sets up a cron job to collect crowd data every 30 minutes.
# Run once: bash setup_cron.sh

BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON=$(which python3)
LOG="$BACKEND_DIR/crowd_collection.log"

CRON_CMD="*/30 * * * * cd $BACKEND_DIR && $PYTHON -m app.scripts.collect_crowd_data >> $LOG 2>&1"

# Check if already installed
if crontab -l 2>/dev/null | grep -q "collect_crowd_data"; then
    echo "✓ Cron job already installed."
    crontab -l | grep "collect_crowd_data"
    exit 0
fi

# Add to crontab
( crontab -l 2>/dev/null; echo "$CRON_CMD" ) | crontab -

echo "✓ Cron job installed. Runs every 30 minutes."
echo "  Log file: $LOG"
echo ""
echo "To check status:"
echo "  crontab -l"
echo "  tail -f $LOG"
echo ""
echo "To remove:"
echo "  crontab -l | grep -v collect_crowd_data | crontab -"
