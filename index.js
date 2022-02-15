// Author: Aonghas Anderson
// Email: aonghas@gmail.com
// Date: Jan 2022

const spauth = require("node-sp-auth");
const axios = require("axios");
const glob = require("glob");
const fs = require("fs");
const { exit } = require("process");
const prompt = require("prompt-sync")();

let headers = null;
let token = null;

var getDirectories = function (src, callback) {
  glob(src + "/**/*.*", callback);
};

function authenticate(url, credentialOptions) {
  return new Promise((resolve, reject) => {
    const creds = credentialOptions || null;
    //get auth options
    console.log(url);

    spauth.getAuth(url, creds).then((options) => {
      //perform request with any http-enabled library (request-promise in a sample below):
      headers = options.headers;
      headers["Accept"] = "application/json;odata=nometadata";
      headers["content-type"] = "application/json";

      axios({
        method: "post",
        url: url + "_api/contextinfo",
        headers: headers,
      }).then((resp) => {
        token = resp.data.FormDigestValue;
        headers["X-RequestDigest"] = token;
        resolve();
      });
    });
  });
}

async function deploy(payload) {
  if (!payload.url || !payload.deployTo) {
    console.error("must provide url and deployTo");
  } else {
    try {
      await authenticate(payload.url);
      console.log("authenticated!");
      console.log(
        "%c\n\n🕑 BEGINNING DEPLOYMENT\n\n",
        "background: #222; color: #00da00"
      );
      console.log(`Deploying to: ${payload.url}sitepages/${payload.deployTo}`);
      console.log("\n⏳ Please wait...");
    } catch (error) {
      console.log(error.message);
      exit(1);
    }

    if (!payload.overwrite) {
      if (
        await axios({
          method: "post",
          url:
            payload.url +
            `_api/web/GetFolderByServerRelativeUrl('sitepages/${payload.deployTo}')/Exists`,
          headers: { ...headers },
        }).then((resp) => {
          return resp.data.value;
        })
      ) {
        console.log(
          `\n⚠️ WARNING: The folder ${payload.url}sitepages/${payload.deployTo} already exists`
        );
        const input = prompt(
          "Everything in this folder will be deleted. Confirm (y/N): "
        );

        if (input.toLowerCase() !== "y") {
          console.log("Deployment cancelled.");
          exit(0);
        }
      }
    }

    try {
      await axios({
        method: "post",
        url:
          payload.url +
          `_api/web/GetFolderByServerRelativeUrl('sitepages/${payload.deployTo}')`,
        headers: { ...headers, "If-Match": "*", "X-HTTP-Method": "DELETE" },
      });
    } catch (error) {
      console.log(error.message);
      exit(1);
    }

    getDirectories("dist", async (err, res) => {
      if (err) {
        // console.log("Error", err);
      } else {
        const files = res;

        for (const file of files) {
          const folders = [
            ...payload.deployTo.split("/").filter((f) => f.length > 0),
            ...file
              .split("/")
              .slice(0, -1)
              .filter((folder) => folder !== "dist"),
          ];

          const promises = [];

          function foldersUpTo(folders, i) {
            const newFolder = folders.reduce((acc, curr, index) => {
              if (index <= i) {
                return acc + curr + "/";
              } else {
                return acc;
              }
            }, "");

            return newFolder;
          }

          for (i = 0; i < folders.length; i++) {
            await axios({
              method: "post",
              headers: headers,
              url: payload.url + "_api/web/folders",
              data: {
                ServerRelativeUrl: "SitePages/" + foldersUpTo(folders, i),
              },
            })
              .then(() => {})
              .catch((e) => {});
          }

          const folderDir = `/folders('` + folders.join(`')/folders('`) + `')`;
          filename = file.split("/").pop();
          const url =
            payload.url +
            "_api/web/lists/getByTitle('Site Pages')/RootFolder" +
            folderDir +
            "/files/add(overwrite=true,url='" +
            filename +
            "')";
          axios({
            method: "post",
            data: fs.readFileSync(file),
            url,
            headers: headers,
          })
            .then((resp) => {
              // console.log("nice");
            })
            .catch((e) => {});
        }
        console.log(`\n\n✅ DEPLOYMENT COMPLETE! 🙌\n\n`);
        console.log(
          `View the site here: \n${payload.url}sitepages/${payload.deployTo}/index.aspx\n\n`
        );
      }
    });
  }
}

exports.deploy = deploy;
