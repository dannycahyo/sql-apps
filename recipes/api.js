const path = require("path");
const express = require("express");
const router = express.Router();
const pg = require("pg");

// client side static assets
router.get("/", (_, res) => res.sendFile(path.join(__dirname, "./index.html")));
router.get("/client.js", (_, res) =>
  res.sendFile(path.join(__dirname, "./client.js"))
);
router.get("/detail-client.js", (_, res) =>
  res.sendFile(path.join(__dirname, "./detail-client.js"))
);
router.get("/style.css", (_, res) =>
  res.sendFile(path.join(__dirname, "../style.css"))
);
router.get("/detail", (_, res) =>
  res.sendFile(path.join(__dirname, "./detail.html"))
);

/**
 * Student code starts here
 */

// connect to postgres
const pool = new pg.Pool({
  user: "postgres",
  host: "localhost",
  database: "recipeguru",
  password: "lol",
  port: 5432,
});

router.get("/search", async function (req, res) {
  try {
    console.log("search recipes");

    const { rows } = await pool.query(
      `SELECT DISTINCT ON (r.recipe_id) 
        r.recipe_id, r.title, COALESCE(rp.url, 'default.jpg') AS url
      FROM 
        recipes r 
      LEFT JOIN 
        recipes_photos rp 
      ON 
        r.recipe_id = rp.recipe_id 
      GROUP BY 
        r.recipe_id, rp.url ORDER BY r.recipe_id ASC
      `
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "No recipes found." });
    }

    res.status(200).json({ status: "success", rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while processing your request.",
    });
  }
});

router.get("/get", async (req, res) => {
  try {
    const recipeId = req.query.id ? parseInt(req.query.id, 10) : 1;
    if (isNaN(recipeId) || recipeId < 1) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid recipe ID." });
    }
    console.log("recipe get", recipeId);

    const ingredientsPromise = pool.query(
      `SELECT 
        i.title AS ingredient_title, i.image AS ingredient_image, i.type AS ingredient_type
      FROM
        recipe_ingredients ri
      INNER JOIN
        ingredients i
      ON
        i.id = ri.ingredient_id
      WHERE
        ri.recipe_id = $1;
      `,
      [recipeId]
    );

    const recipesPromise = pool.query(
      `SELECT
        r.title, r.body, COALESCE(rp.url, 'default.jpg') AS url
      FROM
        recipes r
      LEFT JOIN 
        recipes_photos rp
      ON
        r.recipe_id = rp.recipe_id
      WHERE 
        r.recipe_id = $1;
      `,
      [recipeId]
    );

    const [{ rows: ingredients }, { rows: recipes }] = await Promise.all([
      ingredientsPromise,
      recipesPromise,
    ]);

    if (recipes.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "No recipe found with this ID." });
    }

    if (ingredients.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No ingredients found for this recipe.",
      });
    }

    res.status(200).json({
      status: "success",
      ingredients,
      photos: recipes.map((recipe) => recipe.url),
      title: recipes[0].title,
      body: recipes[0].body,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while processing your request.",
    });
  }
});
/**
 * Student code ends here
 */

module.exports = router;
