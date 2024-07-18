import { chain, Rule, schematic, SchematicContext, Tree } from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import { getProjectFromWorkspace } from '@angular/cdk/schematics';
import { getWorkspace } from '@schematics/angular/utility/workspace';
import { addPackageToPackageJson } from '../utils/package-config';
import { getProjectStyle } from '../utils/project-style';
import { hammerjsVersion, zorroVersion } from '../utils/version-names';
import { Schema } from './schema';
import { WorkspaceDefinition } from '@angular-devkit/core/src/workspace';

export default function (options: Schema): Rule {
  return chain([
    (host: Tree) => {
      if (!options.skipPackageJson) {
        addPackageToPackageJson(host, 'ng-zorro-antd', zorroVersion);
        if (options.gestures) {
          addPackageToPackageJson(host, 'hammerjs', hammerjsVersion);
        }
      }
    },
    schematic('ng-add-setup-project', options),
    async (host: Tree) => {
      if (options.template) {
        const workspace = await getWorkspace(host);
        const project = getProjectFromWorkspace(workspace as unknown as WorkspaceDefinition, options.project);
        const style = getProjectStyle(project);

        return schematic(options.template, {...options, style: style});
      }
    },
    (_: Tree, context: SchematicContext) => {
      if (options.skipInstall) {
        return;
      }
      context.addTask(new NodePackageInstallTask());
    }
  ]);
}
