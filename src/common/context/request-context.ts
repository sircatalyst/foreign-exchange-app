import { AsyncLocalStorage } from "async_hooks";

interface RequestStore {
	reqId: string;
}

const storage = new AsyncLocalStorage<RequestStore>();

export const RequestContext = {
	run(reqId: string, fn: () => void): void {
		storage.run({ reqId }, fn);
	},

	getReqId(): string {
		return storage.getStore()?.reqId ?? "N/A";
	},
};
