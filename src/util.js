export const functions = {

    isDrawable(d, timeBrush, boxBrush, scatterBrush) {
        if (scatterBrush && timeBrush && boxBrush) {
            return d.selectedTime && d.selectedMobility && d.selectedScatter
        }
        else if (scatterBrush && timeBrush) {
            return d.selectedTime && d.selectedScatter
        }
        else if (scatterBrush && boxBrush) {
            return d.selectedTime && d.selectedMobility
        }
        else if (timeBrush && boxBrush) {
            return d.selectedTime && d.selectedMobility
        }
        else if (boxBrush) {
            return d.selectedMobility
        }
        else if (timeBrush) {
            return d.selectedTime
        }
        else if (scatterBrush) {
            return d.selectedScatter
        }
        else {
            return true;
        }
    },

    logViewStatus(viewName, dataLength, timeBrush, boxBrush, scatterBrush) {
        function onOff(booleanValue) {
            return booleanValue ? "on" : "off"
        }
        console.log(
            "%s receives %d elements. Interaction Status\n- timeBrush: %s\n- boxBrush: %s\n- scatterBrush: %s",
            viewName,
            dataLength,
            onOff(timeBrush),
            onOff(boxBrush),
            onOff(scatterBrush));
    }
}