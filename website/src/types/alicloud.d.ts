declare module "@alicloud/pop-core" {
  interface CoreOptions {
    accessKeyId: string;
    accessKeySecret: string;
    endpoint: string;
    apiVersion: string;
  }
  export default class Core {
    constructor(options: CoreOptions);
    request<T>(action: string, params: Record<string, unknown>, options?: { method?: string; timeout?: number }): Promise<T>;
  }
}
