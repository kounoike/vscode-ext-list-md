import React, { useEffect, useState } from 'react';
import './App.css';
import Mustache from 'mustache';

const defaultTemplate = 
`### [{{extension.displayName}}](https://marketplace.visualstudio.com/items?itemName={{extensionName}}) {{version.version}}

<table>
  <tbody>
    <tr>
      <td rowspan="2" style="width:74px;height:74px;padding:2px"> <img style="width:72px;height:72px" src="{{#assets.Microsoft_VisualStudio_Services_Icons_Small}}{{& assets.Microsoft_VisualStudio_Services_Icons_Small}}{{/assets.Microsoft_VisualStudio_Services_Icons_Small}}{{^assets.Microsoft_VisualStudio_Services_Icons_Small}}https://cdn.vsassets.io/v/M176_20201014.2/_content/Header/default_icon.png{{/assets.Microsoft_VisualStudio_Services_Icons_Small}}"></td>
      <td>{{extensionName}} By: {{extension.publisher.displayName}} Install: {{#toLocaleString}}{{extension.statistics.0.value}}{{/toLocaleString}} Rate: {{#toFixed}}{{extension.statistics.7.value}}{{/toFixed}}</td>
    </tr>
    <tr>
      <td>{{extension.shortDescription}}</td>
    </tr>
  </tbody>
</table>


****
`;


function getExtensionMarkdown(extensionName: string, extension: any, version: any, assets: any, template: string) {
  console.log({ extensionName, extension, version, assets }, assets['Microsoft_VisualStudio_Services_Icons_Small'])
  return Mustache.render(template, {
     extension, version, assets, extensionName,
     toFixed: function() {
      return function(num: number, render: any) {
          return parseFloat(render(num)).toFixed(1);
      }
    },
    toLocaleString: function() {
      return function(num: number, render: any) {
          return parseFloat(render(num)).toLocaleString();
      }
    }
});
}

function App() {
  const [extListString, setExtListString] = useState("");
  const [resultMarkdown, setResultMarkdown] = useState("");
  
  const [template, setTemplate] = useState(defaultTemplate);

  useEffect(() => {
    const extensions = extListString.split(/\n/);
    console.log("Extensions", extensions);
    (async () => {
      const result = await Promise.all(extensions.map(async(ext: string) => {
        if (ext.length > 0) {
          const atIndex = ext.indexOf("@");
          const extName = ext.slice(0, atIndex);
          const extVersion = atIndex > -1 ? ext.slice(atIndex + 1, -1) : "latest";
          console.log(`${ext} not found`);
          // marcketplace API: https://www.slideshare.net/cssho/extensionapi
          const queryEndPoint = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery";
          const method = "POST";
          const headers = {
            "Content-Type": "application/json",
            "Accept": "application/json;api-version=3.0-preview.1"
          }
          const body = JSON.stringify({
            filters: [{
              criteria: [
                {
                  filterType: 7,
                  value: extName
                },
                {
                  filterType: 8,
                  value: "Microsoft.VisualStudio.Code"
                }
              ]
            }],
            flags: 0x01 | 0x02 | 0x04 | 0x08 | 0x10 | 0x20 | 0x40 | 0x80 | 0x100
          });
          return new Promise((resolve, reject) => (async () =>{
            await fetch(queryEndPoint, { method, body, headers })
            .then((res: Response) => res.json())
            .then((res: any) => {
              if (res.results.length > 0 && res.results[0].extensions.length > 0) {
                const extension = res.results[0].extensions[0] as any;
                const versions = extension.versions;
                let version = versions[0];
                console.log("ext", extension, "ver", version);
                for (let idx = 0; idx < versions.length; ++idx) {
                  if (versions[idx].version === extVersion) {
                    version = versions[idx];
                    break;
                  }
                }
                let assets: any = {};
                version.files.forEach((f: any) => {
                  const assetName = f.assetType.replaceAll('.', '_');
                  assets[assetName] = f.source;
                })
                const md = getExtensionMarkdown(extName, extension, version, assets, template);
                console.log(ext, md);
                resolve([extension.displayName.toLowerCase(), md]);
              }
            });
          })());
        }
      }));
      const markdown = result.sort((a:any, b:any) => {
        if (a[0] < b[0]) return -1;
        if (a[0] > b[0]) return 1;
        return 0;
      }).map((a:any)=> a ? a[1] : "").join("\n");
      setResultMarkdown(markdown)
    })();
  }, [extListString, template]);

  const handleChangeExtList = (event: React.FormEvent) => {
    event.preventDefault();
    setExtListString((event.target as any).value);
  }

  const handleChangeTemplate = (event: React.FormEvent) => {
    event.preventDefault();
    setTemplate((event.target as any).value);
  }

  return (
    <div className="App">
      <header className="Apsp-header">
        <table>
          <tbody>
            <tr>
              <td><span>Command: </span></td>
              <td><span className="code">code --list-extensions --show-versions</span></td>
            </tr>
            <tr>
              <td><label>paste ext list</label></td>
              <td><textarea rows={10} cols={120} value={extListString} onChange={handleChangeExtList}></textarea></td>
            </tr>
            <tr>
              <td><label>Template</label></td>
              <td><textarea rows={10} cols={120} value={template} onChange={handleChangeTemplate}></textarea></td>
            </tr>
            <tr>
              <td><label>Result</label></td>
              <td><textarea rows={30} cols={120} value={resultMarkdown} readOnly={true}></textarea></td>
            </tr>
          </tbody>
        </table>
      </header>
    </div>
  );
}

export default App;
