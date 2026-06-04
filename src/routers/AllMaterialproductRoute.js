const express = require("express");
const router = express.Router();
const Product = require("../models/AllmaterialProduct");
const { Material, Costing } = require("../models/Material");

// ── Shared helpers (same as rawMaterialRoute) ─────────────
const UNIT_TO_GRAM = {
  g: 1,
  kg: 1000,
  liter: 1000,
  ml: 1,
  piece: null,
  dozen: null,
  bag: null,
  packet: null,
};

function getPricePerGram(finalPrice, qty, unit) {
  const multiplier = UNIT_TO_GRAM[unit];
  if (!multiplier) return null;
  const totalGrams = qty * multiplier;
  if (totalGrams === 0) return null;
  return finalPrice / totalGrams;
}

// Build a materialId → pricePerGram map using live DB data
async function buildPriceMap() {
  const materials = await Material.find();
  const costings = await Costing.find();

  const map = {};
  for (const mat of materials) {
    const related = costings.filter((c) =>
      c.materials.map((id) => id.toString()).includes(mat._id.toString())
    );
    const extraCost = related.reduce(
      (sum, c) => sum + c.totalCost / c.materials.length,
      0
    );
    const finalPrice = mat.totalBasePrice + extraCost;
    map[mat._id.toString()] = {
      name: mat.name,
      unit: mat.unit,
      qty: mat.qty,
      finalPrice: parseFloat(finalPrice.toFixed(2)),
      pricePerGram: getPricePerGram(finalPrice, mat.qty, mat.unit),
    };
  }
  return map;
}

// ── ROUTES ────────────────────────────────────────────────

// GET /api/products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find()
      .populate("ingredients.material", "name unit qty")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/products
// body: { name, servingSize, ingredients: [{ material: id, gramPerServing }] }
router.post("/", async (req, res) => {
  try {
    const product = await Product.create(req.body);
    await product.populate("ingredients.material", "name unit qty");
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/products/:id
router.put("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("ingredients.material", "name unit qty");
    if (!product)
      return res.status(404).json({ success: false, message: "পাওয়া যায়নি" });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/products/:id
router.delete("/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "মুছে ফেলা হয়েছে" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/products/:id/cost?persons=50
// Returns per-serving cost breakdown + total for N persons
router.get("/:id/cost", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "ingredients.material",
      "name unit qty"
    );
    if (!product)
      return res.status(404).json({ success: false, message: "পাওয়া যায়নি" });

    const priceMap = await buildPriceMap();
    const persons = Math.max(1, parseInt(req.query.persons) || 1);

    let costPerServing = 0;
    const breakdown = [];

    for (const ing of product.ingredients) {
      const matId = ing.material._id.toString();
      const info = priceMap[matId];

      if (!info || info.pricePerGram === null) {
        breakdown.push({
          materialId: matId,
          name: info?.name ?? "unknown",
          unit: info?.unit ?? "–",
          gramPerServing: ing.gramPerServing,
          pricePerGram: null,
          costForServing: null,
          note: "গ্রামে পরিমাপযোগ্য নয় (piece/bag...)",
        });
        continue;
      }

      const costForServing = ing.gramPerServing * info.pricePerGram;
      costPerServing += costForServing;

      breakdown.push({
        materialId: matId,
        name: info.name,
        unit: info.unit,
        gramPerServing: ing.gramPerServing,
        pricePerGram: parseFloat(info.pricePerGram.toFixed(6)),
        costForServing: parseFloat(costForServing.toFixed(4)),
      });
    }

    res.json({
      success: true,
      data: {
        productId: product._id,
        productName: product.name,
        servingSize: product.servingSize,
        persons,
        costPerServing: parseFloat(costPerServing.toFixed(4)),
        totalCost: parseFloat((costPerServing * persons).toFixed(2)),
        breakdown,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;