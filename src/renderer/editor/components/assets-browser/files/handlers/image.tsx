import { clipboard } from "electron";
import { basename, dirname, join } from "path";

import * as React from "react";
import { ContextMenu, Menu, MenuDivider, MenuItem, Tag, Icon as BPIcon } from "@blueprintjs/core";

import { Texture } from "babylonjs";

import { Icon } from "../../../../gui/icon";

import { WorkSpace } from "../../../../project/workspace";

import { KTXTools, KTXToolsType } from "../../../../tools/ktx";

import { AssetsBrowserItemHandler } from "../item-handler";

export class ImageItemHandler extends AssetsBrowserItemHandler {
	/**
	 * Computes the image to render.
	 */
	public computePreview(): React.ReactNode {
		return (
			<img
				src={this.props.absolutePath}
				style={{
					width: "100%",
					height: "100%",
					objectFit: "contain",
				}}
			/>
		);
	}

	/**
	 * Called on the user clicks on the asset.
	 * @param ev defines the reference to the event object.
	 */
	public onClick(ev: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
		const existing = this.props.editor.scene!.textures.filter((t) => t.name === this.props.relativePath);
		if (!existing.length) {
			return;
		}

		if (existing.length === 1) {
			this.props.editor.inspector.setSelectedObject(existing[0]);
		} else {
			const items = existing.map((t) => (
				<MenuItem text={basename(t.metadata?.editorName ?? t.name)} onClick={() => this.props.editor.inspector.setSelectedObject(t)} />
			));

			ContextMenu.show((
				<Menu>
					<Tag>Edit:</Tag>
					{items}
				</Menu>
			), {
				top: ev.clientY,
				left: ev.clientX,
			});
		}
	}

	/**
	 * Called on the user double clicks on the item.
	 * @param ev defines the reference to the event object.
	 */
	public onDoubleClick(_: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
		this.props.editor.addWindowedPlugin("texture-viewer", false, undefined, this.props.absolutePath);
	}

	/**
	 * Called on the user right clicks on the item.
	 * @param ev defines the reference to the event object.
	 */
	public onContextMenu(ev: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
		const ktxMenus: React.ReactNode[] = [<MenuDivider />];
		if (WorkSpace.Workspace?.ktx2CompressedTextures?.enabled) {
			ktxMenus.push.apply(ktxMenus, [
				<MenuItem text="KTX Texture" icon={<Icon src="../images/ktx.png" style={{ filter: "none" }} />}>
					<MenuItem text="Refresh KTX Texture" onClick={() => {
						this.props.editor.assetsBrowser._callSelectedItemsMethod("_handleRefreshKtx", false);
					}} />
					<MenuItem text="Refresh All KTX Texture" onClick={() => {
						this.props.editor.assetsBrowser._callSelectedItemsMethod("_handleRefreshKtx", true);
					}} />
				</MenuItem>,
			]);
		}

		ContextMenu.show((
			<Menu>
				<MenuItem text="Copy Path" icon={<BPIcon icon="clipboard" color="white" />} onClick={() => clipboard.writeText(this.props.relativePath, "clipboard")} />
				<MenuItem text="Copy Absolute Path" icon={<BPIcon icon="clipboard" color="white" />} onClick={() => clipboard.writeText(this.props.absolutePath, "clipboard")} />
				{ktxMenus}
				{this.getCommonContextMenuItems()}
			</Menu>
		), {
			top: ev.clientY,
			left: ev.clientX,
		});
	}

	/**
	 * Called on the user wants to refresh the KTX texture(s).
	 * @hidden
	 */
	public async _handleRefreshKtx(allFormats: boolean): Promise<void> {
		const destination = dirname(this.props.absolutePath);

		if (!allFormats) {
			const forcedFormat = WorkSpace.Workspace?.ktx2CompressedTextures?.forcedFormat ?? "automatic";
			const supportedTextureFormat = (forcedFormat !== "automatic" ? forcedFormat : this.props.editor.engine!.texturesSupported[0]) as KTXToolsType;

			await KTXTools.CompressTexture(this.props.editor, this.props.absolutePath, destination, supportedTextureFormat);
		} else {
			// Regenerate all supported formats
			const allKtxPromises: Promise<void>[] = [];

			for (const type of KTXTools.GetAllKtxFormats()) {
				allKtxPromises.push(KTXTools.CompressTexture(this.props.editor, this.props.absolutePath, destination, type));
			}

			await Promise.all(allKtxPromises);
		}

		return this.props.editor.assetsBrowser.refresh();
	}

	/**
	 * Called on the user starts dragging the item.
	 * @param ev defines the reference to the event object.
	 */
	public onDragStart(ev: React.DragEvent<HTMLDivElement>): void {
		ev.dataTransfer.setData("asset/texture", JSON.stringify({
			absolutePath: this.props.absolutePath,
			relativePath: this.props.relativePath,
		}));
		ev.dataTransfer.setData("plain/text", this.props.absolutePath);
	}

	/**
	 * Called on the user drops the asset in a supported inspector field.
	 * @param ev defiens the reference to the event object.
	 * @param object defines the reference to the object being modified in the inspector.
	 * @param property defines the property of the object to assign the asset instance.
	 */
	public async onDropInInspector(_: React.DragEvent<HTMLElement>, object: any, property: string): Promise<void> {
		let texture = this.props.editor.scene!.textures.find((tex) => tex.name === this.props.relativePath);
		if (!texture) {
			texture = new Texture(this.props.absolutePath, this.props.editor.scene!);
			texture.name = join(dirname(this.props.relativePath), basename(this.props.absolutePath));

			(texture as Texture).url = texture.name;
		}

		object[property] = texture;

		await this.props.editor.assets.refresh();
	}
}
