import { getMockDataPort } from "@/lib/adapters/mockDataAdapter";
import type { DataPort } from "@/lib/ports/DataPort";

export const dataPort: DataPort = getMockDataPort();
