const path = require("path");
const express = require("express");
const router = express.Router();
const pg = require("pg");

// client side static assets
router.get("/", (_, res) => res.sendFile(path.join(__dirname, "./index.html")));
router.get("/client.js", (_, res) =>
  res.sendFile(path.join(__dirname, "./client.js"))
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

router.get("/type", async (req, res) => {
  try {
    const { type } = req.query;

    if (!type) {
      return res
        .status(400)
        .json({ status: "error", message: "Type is required." });
    }

    console.log("get ingredients", type);

    const { rows } = await pool.query(
      `SELECT * FROM ingredients WHERE type = $1`,
      [type]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No ingredients found for this type.",
      });
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

router.get("/search", async (req, res) => {
  try {
    let { term, page } = req.query;
    page = page ? parseInt(page, 10) : 0;
    if (isNaN(page) || page < 0) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid page number." });
    }
    console.log("search ingredients", term, page);

    let whereClause = "";
    const limit = 5;
    const params = [page * limit];

    if (term) {
      term = term.replace(/[\W_]+/g, " ");
      whereClause = `WHERE (title ILIKE $2 OR type ILIKE $2)`;
      params.push(`%${term}%`);
    }

    const { rows } = await pool.query(
      `SELECT *, COUNT(*) OVER ():: INTEGER AS total_count FROM ingredients ${whereClause} OFFSET $1 LIMIT ${limit}`,
      params
    );

    const total_count = rows.length ? rows[0].total_count : 0;
    const total_pages = Math.ceil(total_count / limit);

    res
      .status(200)
      .json({ status: "success", rows, current_page: page, total_pages });
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
