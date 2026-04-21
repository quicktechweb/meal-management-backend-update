const formatCutoff = (startMinutes, meal_on_off_time) => {
  const cutoff = startMinutes - meal_on_off_time * 60;
  const h = Math.floor(cutoff / 60);
  const m = cutoff % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
};

module.exports = formatCutoff;
