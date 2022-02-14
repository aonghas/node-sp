const fileDeploy = require("./index.js");

const SP = fileDeploy.deploy({
  url: `https://vodafone.sharepoint.com/teams/vbapps/vite/`,
  deployTo: "productionnn/subfolder/sub",
});
