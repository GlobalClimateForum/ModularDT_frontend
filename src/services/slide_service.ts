import { api, marpApi } from "./api";

export interface Slide {
    id?: number;
    name: string;
    created_at?: string | null;
    updated_at?: string | null;
    tags: string[];
    width: number;
    height: number;
    sections?: SlideSection[];
    mode?: string;
}

export interface SectionProperties {
    autosize?: boolean;
    bg?: string;
    [key: string]: unknown;   // room to grow without a type change every time
}

export interface SlideSection {
    id?: number | null;
    slide?: number | null;
    view_type: string;
    width_fraction: number;
    content: string;
    content_path: string;
    mode?: 'static' | 'url' | 'interactive';
    parameters?: Parameters;
    url_pattern?: string;
    properties?: SectionProperties;
}

export interface StringParameter {
    type: 'string'
    description?: string
    default?: string | null
}

export interface BooleanParameter {
    type: 'boolean'
    description?: string
    default?: boolean | null
}

export interface NumberParameter {
    type: 'number'
    description?: string
    range?: { min: number | null, max: number | null }
    default?: number | null
}

export interface SelectParameter {
    type: 'select'
    description?: string
    options: string[]
    default?: string | null
}

export type Parameter =
    | StringParameter
    | BooleanParameter
    | NumberParameter
    | SelectParameter

export interface Parameters {
    [key: string]: Parameter
}

export const SlideSectionTypes = [
    { value: "markdown", icon: "markdown", label: "Markdown", description: "Markdown content rendered as MARP slides." },
    { value: "map", icon: "map", label: "Map", description: "Interactive map view." },
    { value: "ipanel", icon: "interactive_space", label: "Interactive Panel", description: "An interactive panel." },
    { value: "vega", icon: "bar_chart", label: "Vega", description: "Vega data visualization." }
];

export const getSlideSectionType = (value: string) => {
    const type = SlideSectionTypes.find(type => type.value === value);
    if (!type) {
        return { value: "unknown", icon: "question_mark", label: "Unknown", description: "Unknown section type." };
    }
    return type;
}

export type SlidePayload = Omit<Slide, "id" | "created_at" | "updated_at">;

export const getSlides = () => api.get("/slides/");
export const getSlide = (id: number) => api.get(`/slides/${id}/`);

export const getISlides = () => api.get("/slides/interactive/");
export const getIPanels = () => api.get("/slides/ipanels/")

export const saveSlide = (slide: Omit<Slide, "id" | "created_at" | "updated_at">, sections: SlideSection[]) =>
    api.post("/slides/", { ...slide, sections });

export const updateSlide = (id: number, slide: Partial<SlidePayload>) =>
    api.patch(`/slides/${id}/`, slide);

export const deleteSlide = (id: number) => api.delete(`/slides/${id}/`);

export type AspectRatio = "16:9" | "4:3";

export const nearestAspectRatio = (width: number, height: number): AspectRatio => {
    const ratio = width / height;
    return Math.abs(ratio - 4 / 3) <= Math.abs(ratio - 16 / 9) ? "4:3" : "16:9";
};

export const renderSlide = (content: string, width: number, height: number) => marpApi.post("/render/", { content, width, height });

export const removeTagFromSlide = (slideId: number, tag: string) => api.delete(`/tags/${tag}/slide/${slideId}/`);
export const addTagToSlide = (slideId: number, tag: string) => api.post(`/tags/${tag}/slide/${slideId}/`);