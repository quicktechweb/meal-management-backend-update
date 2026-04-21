const checkMealTimeStatus = (
  start_time,
  end_time,
  meal_on_off_time,
  currentMinutes,
) => {
  const [startHour = 0, startMin = 0] = (start_time || "0:00")
    .split(":")
    .map(Number);
  const [endHour = 0, endMin = 0] = (end_time || "0:00").split(":").map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const cutoffMinutes = startMinutes - meal_on_off_time * 60;

  if (currentMinutes >= endMinutes) {
    return { zone: "meal_over", startMinutes, cutoffMinutes };
  } else if (currentMinutes >= cutoffMinutes) {
    return { zone: "time_over", startMinutes, cutoffMinutes };
  } else {
    return { zone: "allow", startMinutes, cutoffMinutes };
  }
};

module.exports = checkMealTimeStatus;
