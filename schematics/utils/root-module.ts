import { WorkspaceDefinition } from '@angular-devkit/core/src/workspace';
import { noop, Rule, SchematicsException, Tree } from '@angular-devkit/schematics';
import { addDeclarationToModule, addModuleImportToRootModule, getProjectFromWorkspace, getProjectMainFile } from '@angular/cdk/schematics';
import { InsertChange } from '@schematics/angular/utility/change';
import { buildRelativePath } from '@schematics/angular/utility/find-module';
import { getAppModulePath } from '@schematics/angular/utility/ng-ast-utils';
import { getWorkspace } from '@schematics/angular/utility/workspace';
import * as ts from 'typescript';
import * as ts3rd from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { Schema } from '../ng-generate/topnav/schema';

function readIntoSourceFile(host: Tree, modulePath: string): ts.SourceFile {
  const text = host.read(modulePath);
  if (text === null) {
    throw new SchematicsException(`File ${modulePath} does not exist.`);
  }
  const sourceText = text.toString('utf-8');

  return ts.createSourceFile(modulePath, sourceText, ts.ScriptTarget.Latest, true);
}

export function addModule(moduleName: string, modulePath: string, options: Schema): Rule {
  return async (host: Tree) => {
    const workspace = await getWorkspace(host) as unknown as WorkspaceDefinition;
    const project = getProjectFromWorkspace(workspace, options.project);
    addModuleImportToRootModule(host, moduleName, modulePath, project);
    return noop();
  }
}

export function addDeclaration(componentName: string, componentPath: string, options: Schema): Rule {
  return async (host: Tree) => {
    const workspace = await getWorkspace(host) as unknown as WorkspaceDefinition;
    const project = getProjectFromWorkspace(workspace, options.project)
    const appModulePath = getAppModulePath(host, getProjectMainFile(project));
    const source = readIntoSourceFile(host, appModulePath);
    const relativePath = buildRelativePath(appModulePath, componentPath);
    const declarationChanges = addDeclarationToModule(source as unknown as ts3rd.SourceFile, appModulePath, componentName, relativePath);
    const declarationRecorder = host.beginUpdate(appModulePath);
    for (const change of declarationChanges) {
      if (change instanceof InsertChange) {
        declarationRecorder.insertLeft(change.pos, change.toAdd);
      }
    }
    host.commitUpdate(declarationRecorder);

    return noop();
  }
}
