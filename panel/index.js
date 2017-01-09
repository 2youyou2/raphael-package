
// panel/index.js, this filename needs to match the one registered in package.json
Editor.Panel.extend({
  // css style for panel
  style: `
    :host { 
      display: flex;
      flex-direction: column;
    }
    
    h2 { color: #f90; }

    header {
        height: 26px;
        display: flex;
        margin: 0 20px;
        padding: 15px 0;
        border-bottom: 1px solid #666;
    }

    section {
        margin: 10px 10px;
        padding: 0 10px;
        flex: 1;
        overflow-y: auto;
    }

    footer {
        padding: 10px 0;
        justify-content: flex-end;
    }
  `,

  // html template for panel
  template: `
    <header>
      <h2>raphael-package</h2>
    </header>
    <section>
      <ui-prop name="group" auto-height>
        <div class="flex-1 layout vertical">
          <ui-checkbox v-for="c in group" v-on:confirm="_onComponentChanged($event, 'group', c)" v-value="c.checked">
            {{c.name}}
          </ui-checkbox>
        </div>
      </ui-prop>
      <ui-prop name="path" auto-height>
        <div class="flex-1 layout vertical">
          <ui-checkbox v-for="c in path" v-on:confirm="_onComponentChanged($event, 'path', c)" v-value="c.checked">
            {{c.name}}
          </ui-checkbox>
        </div>
      </ui-prop>
    </section>
    <footer class="group layout horizontal center">
      <ui-button v-on:confirm="_onInstall">Install</ui-button>
    </footer>
  `,

  // element and variable binding
  $: {
    btn: '#btn',
    label: '#label',
  },

  // method executed when template and styles are successfully loaded and initialized
  ready () {
    const Fs = require('fire-fs');
    const Del = require('del');
    const Globby = require('globby');
    const Path = require('path');

    let project = this.profiles.project;
    let profile = project.data;
    let data = {
      group: [
        {name: 'svg'}
      ],
      path: [
        {name: 'animate'},
        {name: 'simplify'},
        {name: 'smooth'}
      ]
    };

    for (let type in data) {
      let item = data[type];
      for (let i = 0; i < item.length; i++) {
        if (profile[type].indexOf( item[i].name ) !== -1) {
          item[i].checked = true;
        }
      }
    }

    let vm = this._vm = new window.Vue({
      el: this.shadowRoot,

      data: data,

      methods: {
        _onComponentChanged (event, type, c) {
          profile = project.data;

          if (event.detail.value) {
            if (profile[type].indexOf(c.name) === -1) {
              profile[type].push(c.name);
            }
          }
          else {
            let index = profile[type].indexOf(c.name);
            if (index !== -1) {
              profile[type].splice(index, 1);
            }
          }

          project.save();
        },

        _onInstall () {
          this._installNodeModules();
          this._installRaphael();
        },

        _installNodeModules () {
          let srcDir = Editor.url('packages://raphael-package/node_modules');
          let destDir = Path.join(Editor.projectInfo.path, 'node_modules');

          Globby(Path.join(srcDir, '*'), (err, paths) => {
            if (err) return Editor.error(err);

            paths.forEach(path => {
              path = Path.normalize(path);
              let dest = Path.join(destDir, Path.relative(srcDir, path));

              if (Fs.existsSync(dest)) {
                return;
              }

              Fs.copySync(path, dest);
            });
          });
        },

        _installRaphael () {
          let src = Editor.url('packages://raphael-package/raphael');
          let dest = Editor.url('db://assets/raphael');

          if (Fs.existsSync(dest)) {
            Del.sync(dest, {force: true});
          }

          let componentPath = Path.join(src, 'component/optional');
          let pattern = [
            Path.join(src, '**/*.js'),
            Path.join(src, '**/*.js.meta'),
            '!'+Path.join(componentPath, '**/*')
          ];

          let components = profile.group.concat( profile.path );
          for (let i = 0; i < components.length; i++) {
            let c = components[i];
            pattern.push( Path.join(componentPath, `R.${c}.js`) );
            pattern.push( Path.join(componentPath, `R.${c}.js.meta`) );
          }

          Globby(pattern, (err, paths) => {
            if (err) return Editor.error(err);

            paths = paths.map(path => {
              path = Path.normalize(path);
              if (Fs.isDirSync(path)) {
                return;
              }

              let destPath = Path.join(dest, Path.relative(src, path));
              Fs.ensureDirSync(Path.dirname(destPath));
              Fs.copySync(path, destPath);
            });
            
            this._replaceContent(Path.join(dest, 'R.group.js'));
            this._replaceContent(Path.join(dest, 'R.path.js'));

            Editor.assetdb.refresh('db://assets/raphael', (err) => {
              if (err) return Editor.error(err);
              Editor.log('Update raphael successfully');
            });
          });
        },

        _replaceContent (path) {
          let content = Fs.readFileSync(path, 'utf8');

          for (let i = 0; i < data.group.length; i++) {
            let name = data.group[i].name;
            if (profile.group.indexOf(name) === -1) {
              content = content.replace(`var ${name} = require('./component/optional/R.${name}');`, `var ${name} = {};`);
            }
          }

          for (let i = 0; i < data.path.length; i++) {
            let name = data.path[i].name;
            if (profile.path.indexOf(name) === -1) {
              content = content.replace(`var ${name} = require('./component/optional/R.${name}');`, `var ${name} = {};`);
            }
          }

          Fs.writeFileSync(path, content);
        }
      }
    });
  }
});
