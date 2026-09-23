const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const corsOptions = require("./config/cors");
const authRoutes = require("./routes/auth.routes");
const companyRoutes = require("./routes/company.routes");
const branchRoutes = require("./routes/branch.routes");
const userRoutes = require("./routes/user.routes");
const { notFound, errorHandler } = require("./middleware/error.middleware");

const app = express();

app.use(helmet());

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/users", userRoutes);




app.use(notFound);
app.use(errorHandler);

module.exports = app;