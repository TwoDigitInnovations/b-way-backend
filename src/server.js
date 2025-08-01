require("dotenv").config();
require("module-alias/register");
const app = require("./app");

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
