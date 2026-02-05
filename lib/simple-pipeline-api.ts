// Simple Pipeline API - Just 2 functions!
"use client"

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:57214/api/indas";

async function apiFetch(url: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        ...(options.headers as Record<string, string>),
    };

    // Add Basic Auth (company credentials) - required by ValidateUserCRM
    if (typeof window !== 'undefined') {
        const companyName = localStorage.getItem("companyName");
        const companyPassword = localStorage.getItem("companyPassword");

        if (companyName && companyPassword) {
            const credentials = btoa(`${companyName}:${companyPassword}`);
            headers["Authorization"] = `Basic ${credentials}`;
        }
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }

    return await response.json();
}

export const simplePipelineApi = {
    // Get pipeline with all stages and leads
    getPipeline: async (companyId?: number) => {
        const url = companyId
            ? `${API_URL}/SimplePipeline?companyId=${companyId}`
            : `${API_URL}/SimplePipeline`;
        return await apiFetch(url);
    },

    // Move a lead to a different stage
    moveLead: async (leadId: number, stageId: number) => {
        return await apiFetch(`${API_URL}/SimplePipeline/move`, {
            method: "POST",
            body: JSON.stringify({ leadId, stageId }),
        });
    },

    // Get just the stages (for dropdowns)
    getStages: async (): Promise<{ id: number; name: string; color: string }[]> => {
        const data = await apiFetch(`${API_URL}/SimplePipeline`);
        return data.stages.map((s: PipelineStage) => ({
            id: s.id,
            name: s.name,
            color: s.color
        }));
    },
};

// TypeScript types
export interface PipelineStage {
    id: number;
    name: string;
    order: number;
    color: string;
    count: number;
    value: number;
    leads: PipelineLead[];
}

export interface PipelineLead {
    id: number;
    name: string;
    revenue?: number;
    contact?: string;
    phone?: string;
}

export interface PipelineData {
    stages: PipelineStage[];
}
