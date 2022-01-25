import { Nullable } from "../../../../shared/types";

import * as React from "react";

import { Animation } from "babylonjs";

import { InspectorList } from "../../../editor/gui/inspector/fields/list";
import { InspectorString } from "../../../editor/gui/inspector/fields/string";
import { InspectorSection } from "../../../editor/gui/inspector/fields/section";

import { Tools } from "../../../editor/tools/tools";

import { Inspector, IObjectInspectorProps } from "../../../editor/components/inspector";
import { AbstractInspector } from "../../../editor/components/inspectors/abstract-inspector";

import { ICinematicTrack } from "../../../editor/cinematic/base";

import { Tracks } from "../panels/tracks";

import { CinematicInspectorGroupSelector } from "./components/group-selector";

export class CinematicPropertyTrack {
	/**
	 * Defines the id of the cinematic animation key object.
	 */
	public id: string = Tools.RandomId();

	/**
	 * Constructor.
	 */
	public constructor(public track: ICinematicTrack, public tracks: Nullable<Tracks>) {
		// Empty for now...
	}
}

export interface ICinematicPropertyTrackInspectorState {
	// Nothing for now...
}

export class CinematicPropertyTrackInspector extends AbstractInspector<CinematicPropertyTrack, ICinematicPropertyTrackInspectorState> {
	/**
	 * Constructor.
	 * @param props defines the component's props.
	 */
	public constructor(props: IObjectInspectorProps) {
		super(props);

		this.state = {
			...this.state,
		};
	}

	/**
	 * Renders the content of the inspector.
	 */
	public renderContent(): React.ReactNode {
		return (
			<InspectorSection title="Animation Key">
				<InspectorString key={Tools.RandomId()} object={this.selectedObject.track.property} property="propertyPath" label="Property Path" onFinishChange={() => {
					this.selectedObject.tracks?.refreshTracks();
				}} />
				<InspectorList key={Tools.RandomId()} object={this.selectedObject.track.property} property="animationType" label="Type" items={[
					{ label: "Float", data: Animation.ANIMATIONTYPE_FLOAT },
					{ label: "Vector2", data: Animation.ANIMATIONTYPE_VECTOR2 },
					{ label: "Vector3", data: Animation.ANIMATIONTYPE_VECTOR3 },
					{ label: "Quaternion", data: Animation.ANIMATIONTYPE_QUATERNION },
					{ label: "Color3", data: Animation.ANIMATIONTYPE_COLOR3 },
					{ label: "Color4", data: Animation.ANIMATIONTYPE_COLOR4 },
					{ label: "Matrix", data: Animation.ANIMATIONTYPE_MATRIX },
				]} />
				<CinematicInspectorGroupSelector track={this.selectedObject.track} tracks={this.selectedObject.tracks} />
			</InspectorSection>
		);
	}
}

Inspector.RegisterObjectInspector({
	ctor: CinematicPropertyTrackInspector,
	ctorNames: ["CinematicPropertyTrack"],
	title: "Property Track",
});
