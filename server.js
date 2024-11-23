const express = require("express");
const multer = require("multer");
const fs = require("fs");
const fastCsv = require("fast-csv");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Configure multer for file upload
const upload = multer({ dest: "uploads/" });


//
app.get('/', (req, res) => {
  res.send("Hello World");  
})


// Endpoint to process CSV
app.post("/upload", upload.single("file"), (req, res) => {
  const filePath = req.file.path;
  const processedData = [];
  const keywords = ["patch", "put", "post"];

  // Read the CSV file
  fs.createReadStream(filePath)
    .pipe(fastCsv.parse({ headers: true }))
    .on("data", (row) => {
      // Check if the first column has text and process it
      const firstColumn = Object.values(row)[0]?.toString().toLowerCase();
      if (firstColumn) {
        // Find keywords in the text
        const foundKeywords = keywords.filter((keyword) =>
          firstColumn.includes(keyword)
        );

        // Add keywords to the new column
        row["New Column"] = foundKeywords.join(", ");
      } else {
        row["New Column"] = "No Text Found"; // Optional: Define behavior for empty cells
      }
      processedData.push(row);
    })
    .on("end", () => {
      // Write processed data to a new CSV
      const processedFilePath = `processed_${req.file.originalname}`;
      const ws = fs.createWriteStream(processedFilePath);
      fastCsv
        .write(processedData, { headers: true })
        .pipe(ws)
        .on("finish", () => {
          res.download(processedFilePath, () => {
            // Clean up temporary files
            fs.unlinkSync(filePath);
            fs.unlinkSync(processedFilePath);
          });
        });
    });
});

// Start the server
app.listen(5000, () => {
  console.log(`Server is running on http://localhost:5000`);
});
