const express = require("express");
const multer = require("multer");
const fs = require("fs");
const fastCsv = require("fast-csv");
const cors = require("cors");
const moment = require("moment");

const app = express();
app.use(cors());
app.use(express.json());

// Configure multer for file upload
const upload = multer({ dest: "uploads/" });

app.get("/", (req, res) => {
  res.send("Hello Everyone");
});

// Endpoint to process CSV
app.post("/upload", upload.single("file"), (req, res) => {
  const filePath = req.file.path;
  const processedData = [];

  // Read the CSV file
  fs.createReadStream(filePath)
    .pipe(fastCsv.parse({ headers: true }))
    .on("data", (row) => {
      // Process "Solution" column for Remediation Type
      const solution = row["Solution"]?.toString().toLowerCase();
      let remediationType = "configurable"; // Default to configurable
      if (solution) {
        if (solution.includes("patch") || solution.includes("patching")) {
          remediationType = "patchable";
        } else if (
          solution.includes("upgrade") ||
          solution.includes("upgraded") ||
          solution.includes("upgrading")
        ) {
          remediationType = "upgradable";
        }
      }
      row["Remediation Type"] = remediationType;

      // Process "First Detected" column for Age Calculation
      const firstDetected = row["First Detected"];
      let ageCalculation = ">90 Days"; // Default to >90 Days
      if (firstDetected) {
        const detectedDate = moment(firstDetected, "MM/DD/YYYY");
        const daysDiff = moment().diff(detectedDate, "days");
        if (daysDiff < 30) {
          ageCalculation = "<30 Days";
        } else if (daysDiff <= 60) {
          ageCalculation = "30-60 Days";
        } else if (daysDiff <= 90) {
          ageCalculation = "60-90 Days";
        }
      }
      row["Age Calculation"] = ageCalculation;

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