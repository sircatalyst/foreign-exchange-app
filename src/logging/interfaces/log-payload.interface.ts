export type LogPayloadType = {
	Service: string;
	Method: string;
	Action: string;
	User: string;
	Payload?: { [key: string]: object | string } | string | any;
	Returns?: { [key: string]: object | string } | string | any;
};
