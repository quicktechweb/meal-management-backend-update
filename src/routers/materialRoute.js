const express = require("express");
const router = express.Router();
const { Material, Costing } = require("../models/Material");

// ── Unit → Gram conversion ────────────────────────────────
// Returns how many grams 1 unit equals. null = non-weight unit (piece/dozen/bag/packet)
const UNIT_TO_GRAM = {
  g:      1,
  kg:     1000,
  liter:  1000,   // 1L water ≈ 1000g (close enough for costing)
  ml:     1,      // 1ml ≈ 1g
  piece:  null,
  dozen:  null,
  bag:    null,
  packet: null,
};

function calcPricePerGram(finalPrice, qty, unit) {
  const multiplier = UNIT_TO_GRAM[unit];
  if (multiplier === null || multiplier === undefined) return null; // non-measurable unit
  const totalGrams = qty * multiplier;
  if (totalGrams === 0) return null;
  return parseFloat((finalPrice / totalGrams).toFixed(4));
}

// ── MATERIAL ROUTES ──────────────────────────────────────

// GET /api/raw-materials
router.get("/", async (req, res) => {
  try {
    const materials = await Material.find().sort({ createdAt: -1 });
    const costings = await Costing.find();

    const data = materials.map((mat) => {
      const related = costings.filter((c) =>
        c.materials.map((id) => id.toString()).includes(mat._id.toString())
      );
      const extraCost = related.reduce((sum, c) => sum + c.totalCost / c.materials.length, 0);
      const finalPrice = parseFloat((mat.totalBasePrice + extraCost).toFixed(2));

      return {
        ...mat.toJSON(),
        extraCost: parseFloat(extraCost.toFixed(2)),
        finalPrice,
        pricePerGram: calcPricePerGram(finalPrice, mat.qty, mat.unit),
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/raw-materials
router.post("/", async (req, res) => {
  try {
    const material = await Material.create(req.body);
    res.status(201).json({ success: true, data: material });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/raw-materials/:id
router.put("/:id", async (req, res) => {
  try {
    const material = await Material.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!material) return res.status(404).json({ success: false, message: "পাওয়া যায়নি" });
    res.json({ success: true, data: material });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/raw-materials/:id
router.delete("/:id", async (req, res) => {
  try {
    await Material.findByIdAndDelete(req.params.id);
    await Costing.updateMany({ materials: req.params.id }, { $pull: { materials: req.params.id } });
    res.json({ success: true, message: "মুছে ফেলা হয়েছে" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── COSTING ROUTES ───────────────────────────────────────

// GET /api/raw-materials/costings
router.get("/costings", async (req, res) => {
  try {
    const costings = await Costing.find().populate("materials", "name qty unit");
    res.json({ success: true, data: costings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/raw-materials/costings
router.post("/costings", async (req, res) => {
  try {
    const costing = await Costing.create(req.body);
    await costing.populate("materials", "name qty unit");
    res.status(201).json({
      success: true,
      data: { ...costing.toJSON(), costPerMaterial: costing.costPerMaterial },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/raw-materials/costings/:id
router.delete("/costings/:id", async (req, res) => {
  try {
    await Costing.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "মুছে ফেলা হয়েছে" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/raw-materials/costings/summary
router.get("/costings/summary", async (req, res) => {
  try {
    const materials = await Material.find();
    const costings = await Costing.find();

    let totalBase = 0, totalExtra = 0;

    const data = materials.map((mat) => {
      const related = costings.filter((c) =>
        c.materials.map((id) => id.toString()).includes(mat._id.toString())
      );
      const extraCost = related.reduce((sum, c) => sum + c.totalCost / c.materials.length, 0);
      const finalPrice = parseFloat((mat.totalBasePrice + extraCost).toFixed(2));
      totalBase += mat.totalBasePrice;
      totalExtra += extraCost;

      return {
        _id: mat._id,
        name: mat.name,
        qty: mat.qty,
        unit: mat.unit,
        basePrice: mat.totalBasePrice,
        extraCost: parseFloat(extraCost.toFixed(2)),
        finalPrice,
        pricePerGram: calcPricePerGram(finalPrice, mat.qty, mat.unit),
      };
    });

    res.json({
      success: true,
      data,
      totals: {
        totalBase: parseFloat(totalBase.toFixed(2)),
        totalExtra: parseFloat(totalExtra.toFixed(2)),
        grandTotal: parseFloat((totalBase + totalExtra).toFixed(2)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;