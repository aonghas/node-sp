const fileDeploy = require("./index.js");
require("dotenv").config();

const targets = process.argv.slice(2).filter((arg) => arg.charAt(0) != "-");
const options = process.argv.slice(2).filter((arg) => arg.charAt(0) == "-");

if (targets.length == 0) {
  console.error("Please specify where you want to deploy the files.");
}

targets.forEach((target) => {
  const SP = fileDeploy.deploy({
    url: `${process.env.URL_HOST}${process.env.VUE_APP_URL}`,
    deployTo: target,
    options,
  });
});
