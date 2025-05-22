const app = require("./app");
const dotenv = require("dotenv");
const http = require("http");
const dbConnection = require("./config/dbConnection");

dotenv.config();

dbConnection();
const port = process.env.PORT || 4501;


const server = http.createServer(app);
server.listen(port, () => {
  console.log(`Server is running on ${port}`);
  console.log("Current Time:", new Date().toString());
});
