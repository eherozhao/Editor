import { join } from "path";
import { platform } from "os";
import { readJSON } from "fs-extra";
import { execSync } from "child_process";

import { Nullable } from "../../../../shared/types";

import * as React from "react";
import { H3 } from "@blueprintjs/core";

import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";

import { Tools } from "../../../editor/tools/tools";
import { ExecTools, IExecProcess } from "../../../editor/tools/exec";

import { Alert } from "../../../editor/gui/alert";
import { Dialog } from "../../../editor/gui/dialog";

import { InspectorButton } from "../../../editor/gui/inspector/fields/button";
import { InspectorSection } from "../../../editor/gui/inspector/fields/section";
import { InspectorBoolean } from "../../../editor/gui/inspector/fields/boolean";

import { IPreferencesPanelProps } from "../index";
import { Confirm } from "../../../editor/gui/confirm";

export class PluginsPreferencesPanel extends React.Component<IPreferencesPanelProps> {
	/**
	 * Renders the component.
	 */
	public render(): React.ReactNode {
		return (
			<div style={{ width: "70%", height: "100%", margin: "auto" }}>
				<InspectorSection title="Actions">
					<InspectorButton label="Add..." onClick={() => this._handleAddPluginFromFileSystem()} />
					<InspectorButton label="Add From NPM..." onClick={() => this._handleAddOrRemovePluginFromNpm()} />
				</InspectorSection>

				<InspectorSection title="Available Plugins">
					{this._getAvailablePlugins()}
				</InspectorSection>
			</div>
		);
	}

	/**
	 * Returns the list of all available plugins.
	 */
	private _getAvailablePlugins(): React.ReactNode {
		const plugins = this.props.preferences.state.editor.plugins ?? [];

		this.props.preferences.state.editor.plugins = plugins;

		if (!plugins.length) {
			return (
				<H3 style={{ textAlign: "center" }}>No Plugin Available.</H3>
			);
		}

		return plugins.map((p, index) => (
			<InspectorSection title={`${index} - ${p.name}`}>
				<span>Path: "{p.path}"</span>
				<InspectorBoolean object={p} property="enabled" label="Enabled" />
				<InspectorButton label="Remove" onClick={() => this._handleRemovePlugin(index)} />
			</InspectorSection>
		));
	}

	/**
	 * Called on the user wants to remove an existing plugin.
	 */
	private async _handleRemovePlugin(index: number): Promise<void> {
		const plugins = this.props.preferences.state.editor.plugins;
		if (!plugins) {
			return;
		}

		const plugin = plugins[index];
		const remove = await Confirm.Show("Remove plugin?", `Are you sure to remove the plugin named "${plugin.name}"?`);

		if (!remove) {
			return;
		}

		if (plugin.fromNpm) {
			await this._handleAddOrRemovePluginFromNpm(true, plugin.name);
		}

		plugins.splice(index, 1);
		this.forceUpdate();
	}

	/**
	 * Called on the user wants to add a new plugin from the file system.
	 */
	private async _handleAddPluginFromFileSystem(): Promise<void> {
		const plugins = this.props.preferences.state.editor.plugins;
		if (!plugins) {
			return;
		}

		const folder = await Tools.ShowSaveDialog();

		try {
			require(folder);
		} catch (e) {
			return;
		}

		const packageJson = await readJSON(join(folder, "package.json"), { encoding: "utf-8" });

		const exists = plugins.find((p) => p.name === packageJson.name);
		if (exists) { return; }

		plugins.push({
			name: packageJson.name,
			path: folder,
			enabled: true,
		});

		this.forceUpdate();
	}

	/**
	 * Called on the user wants to add a plugin from NPM.
	 */
	private async _handleAddOrRemovePluginFromNpm(remove?: boolean, moduleName?: string): Promise<void> {
		const plugins = this.props.preferences.state.editor.plugins;
		if (!plugins) {
			return;
		}

		moduleName = moduleName ?? await Dialog.Show("NPM Package Name", "Please provide the name of the package available on Npm");

		if (!remove) {
			const exists = plugins.find((p) => p.name === moduleName);
			if (exists) { return; }
		}

		const sudo = platform() === "win32" ? "" : "sudo ";
		const program = ExecTools.ExecCommand(remove ? `${sudo}npm uninstall -g ${moduleName} && exit` : `${sudo}npm i -g ${moduleName} && exit`);

		const alert = await this._createInstallNpmAlert(moduleName, program);

		try {
			await program.promise;

			if (!remove) {
				const globalNodeModules = execSync("npm root -g").toString().trim();
				plugins.push({
					enabled: true,
					fromNpm: true,
					name: moduleName,
					path: join(globalNodeModules, moduleName),
				});
			}
		} catch (e) {
			// Catch silently.
		}

		alert.close();

		if (!remove) {
			this.forceUpdate();
		}
	}

	/**
	 * Creates the alert used to render the "npm i -g" command in a terminal.
	 */
	private async _createInstallNpmAlert(moduleName: string, program: IExecProcess): Promise<Alert> {
		return new Promise<Alert>((resolve) => {
			Alert.Show("Installing...", `Installing Module "${moduleName}"`, undefined, (
				<div ref={(ref) => this._createTerminal(ref, program)} style={{ width: "450px", height: "500px" }}></div>
			), {
				canOutsideClickClose: false,
				isCloseButtonShown: false,
				noFooter: true,
			}, (ref) => {
				resolve(ref);
			})
		});
	}

	/**
	 * Creates the terminal used to render the "npm i -g" process.
	 */
	private async _createTerminal(div: Nullable<HTMLDivElement>, program: IExecProcess): Promise<void> {
		if (!div) {
			return;
		}

		const terminal = new Terminal({
			fontFamily: "Consolas, 'Courier New', monospace",
			fontSize: 12,
			fontWeight: "normal",
			cursorStyle: "block",
			cursorWidth: 1,
			drawBoldTextInBrightColors: true,
			fontWeightBold: "bold",
			letterSpacing: -4,
			lineHeight: 1,
			rendererType: "canvas",
			allowTransparency: true,
			theme: {
				background: "#222222",
			},
		});

		const fitAddon = new FitAddon();

		terminal.onResize(() => {
			program.process.resize(terminal.cols, terminal.rows);
		});
		terminal.loadAddon(fitAddon);
		terminal.open(div);

		program.process.onData((e) => terminal.write(e));
		terminal.onData((d) => program.process.write(d));

		fitAddon.fit();

		setTimeout(() => terminal.focus(), 0);
	}
}
