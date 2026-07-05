// services/materialDeduction.service.js
const { Material } = require("../models/Material");
const Product = require("../models/AllmaterialProduct");

function parseTitles(titleStr = "") {
  return titleStr.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
}

/**
 * একটা নির্দিষ্ট মিলের জন্য raw material stock কমায়।
 * cron-এর ভেতর, balance deduction সফল হওয়ার ঠিক পরে কল হবে।
 */
async function deductMaterialsForMeal(meal, session) {
  const results = [];

  const allProducts = await Product.find({})
    .populate("ingredients.material")
    .session(session);

  const productByName = {};
  allProducts.forEach((p) => {
    productByName[p.name.toLowerCase().trim()] = p;
  });

  const deductMap = {}; // materialId(string) -> totalGramsToDeduct

  (meal.selected_items ?? []).forEach((item) => {
    parseTitles(item.title).forEach((title) => {
      const product = productByName[title];
      if (!product) return;

      (product.ingredients || []).forEach((ing) => {
        const mat = ing.material;
        if (!mat || !mat._id) return;
        const key = String(mat._id);
        deductMap[key] = (deductMap[key] || 0) + ing.gramPerServing;
      });
    });
  });

  for (const [materialId, totalGrams] of Object.entries(deductMap)) {
    const mat = await Material.findById(materialId).session(session);
    if (!mat) {
      results.push({ materialId, status: "not_found" });
      continue;
    }

    const deductInUnit = ["kg", "liter"].includes(mat.unit)
      ? totalGrams / 1000
      : totalGrams;

    const newQty = Math.max(0, mat.qty - deductInUnit);
    mat.qty = newQty;
    await mat.save({ session });

    results.push({
      name: mat.name,
      unit: mat.unit,
      deducted: deductInUnit,
      after: newQty,
      status: "ok",
    });
  }

  return results;
}

module.exports = { deductMaterialsForMeal };