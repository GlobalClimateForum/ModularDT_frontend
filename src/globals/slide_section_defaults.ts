import type { SlideSection } from '@/services/slide_service'

export const slideSectionDefaults: Record<string, SlideSection> = {
    markdown: {
        view_type: "markdown",
        width_fraction: 1.0,
        content: "# New Slide Section\n\nThis is a new slide section. You can edit the content using Markdown.",
        content_path: "",
        mode: "static",
        parameters: {},
        rules: [],
        url_pattern: "",
        properties: { bg: "#ffffff" }
    },
    map: {
        view_type: "map",
        width_fraction: 1.0,
        content: JSON.stringify({
            basemap: "openfreemap_bright",
            startZoom: 2,
            startPosition: [13.350103005033793, 52.51451583081903],
            layers: [],
            positions: []
        }),
        content_path: "",
        mode: "interactive",
        parameters: {
            location: { type: "location", options: {}, default: null },
        },
        rules: [],
        url_pattern: "",
        properties: { bg: "#ffffff" },
    },
    ipanel: {
        view_type: "ipanel",
        width_fraction: 1.0,
        content: JSON.stringify({
            targetSlide: null,
            targetSection: null,
        }),
        content_path: "",
        mode: "static",
        parameters: {},
        rules: [],
        url_pattern: "",
        properties: { bg: "#ffffff" },
    },
    vega: {
        view_type: "vega",
        width_fraction: 1.0,
        content: "",
        content_path: "",
        mode: "static",
        parameters: {},
        rules: [],
        url_pattern: "",
        properties: { bg: "transparent", autosize: true },
    },
    custom: {
        view_type: "custom",
        width_fraction: 1.0,
        content: `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-family: sans-serif;">
  <h1>New Custom Section</h1>
</div>`,
        content_path: "",
        mode: "html",
        parameters: {},
        rules: [],
        url_pattern: "",
        properties: {},
    },
    dynamic: {
        view_type: "dynamic",
        width_fraction: 1.0,
        content: "",
        content_path: "",
        mode: "interactive",
        parameters: {},
        rules: [],
        url_pattern: "",
        properties: {},
    },

}