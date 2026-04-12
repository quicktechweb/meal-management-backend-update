const scheduleData = [
  {
    mealTypeId: 1,
    day: "Sat",
    breakfast: {
      mealType: "breakfast",
      items: [
        { meal_id: 1, title: "Alu Vorta", price: 125 },
        { meal_id: 2, title: "Egg", price: 110 },
        { meal_id: 3, title: "Vat", price: 110 },
        { meal_id: 4, title: "Dal", price: 110 },
      ],
    },
    lunch: {
      mealType: "lunch",
      items: [
        { meal_id: 1, title: "Murgi", price: 200 },
        { meal_id: 2, title: "Mach", price: 500 },
        { meal_id: 3, title: "Goru", price: 500 },
        { meal_id: 4, title: "Vat", price: 500 },
        { meal_id: 5, title: "Dal", price: 500 },
      ],
    },
    dinner: {
      mealType: "dinner",
      items: [
        { meal_id: 1, title: "Murgi", price: 900 },
        { meal_id: 2, title: "Mach", price: 600 },
        { meal_id: 3, title: "Dudh", price: 100 },
        { meal_id: 4, title: "Vat", price: 10 },
      ],
    },
  },

  {
    mealTypeId: 2,
    day: "Sun",
    breakfast: {
      mealType: "breakfast",
      items: [
        { meal_id: 1, title: "Ruti", price: 125 },
        { meal_id: 2, title: "Dim Bhaji", price: 110 },
        { meal_id: 3, title: "Alu Bhaji", price: 110 },
        { meal_id: 4, title: "Vat", price: 110 },
      ],
    },
    lunch: {
      mealType: "lunch",
      items: [
        { meal_id: 1, title: "Murgi", price: 200 },
        { meal_id: 2, title: "Mach", price: 500 },
        { meal_id: 3, title: "Goru", price: 500 },
        { meal_id: 4, title: "Polao", price: 500 },
        { meal_id: 5, title: "Dal", price: 500 },
      ],
    },
    dinner: {
      mealType: "dinner",
      items: [
        { meal_id: 1, title: "Roast", price: 900 },
        { meal_id: 2, title: "Polao", price: 600 },
        { meal_id: 3, title: "Jorda", price: 100 },
        { meal_id: 4, title: "Dal", price: 10 },
      ],
    },
  },

  {
    mealTypeId: 3,
    day: "Mon",
    breakfast: {
      mealType: "breakfast",
      items: [
        { meal_id: 1, title: "Biriyani", price: 125 },
        { meal_id: 2, title: "Polao", price: 110 },
        { meal_id: 3, title: "Roast", price: 110 },
      ],
    },
    lunch: {
      mealType: "lunch",
      items: [
        { meal_id: 1, title: "Murgi", price: 200 },
        { meal_id: 2, title: "Dal", price: 500 },
        { meal_id: 3, title: "Vat", price: 200 },
      ],
    },
    dinner: {
      mealType: "dinner",
      items: [
        { meal_id: 1, title: "Murgi", price: 900 },
        { meal_id: 2, title: "Mach", price: 600 },
        { meal_id: 3, title: "Vat", price: 100 },
      ],
    },
  },
];

module.exports = scheduleData;
