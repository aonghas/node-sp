const fileDeploy = require("./index.js");

const targets = process.argv.slice(2).filter((arg) => arg.charAt(0) != "-");
const options = process.argv.slice(2).filter((arg) => arg.charAt(0) == "-");

if (targets.length == 0) {
  console.error("Please specify where you want to deploy the files.");
}

targets.forEach((target) => {
  const SP = fileDeploy.deploy({
    url: `https://vodafone.sharepoint.com/teams/vbapps/vite/`,
    deployTo: target,
    options,
  });
});
