import { RequirementResultSchema } from "@autix/contracts";
import { RequirementService } from "../src/llm/requirement.service";
import { createChatModel } from "../src/llm/model.factory";

// 模拟模型工厂，避免真实调用 DeepSeek API（@swc/jest 会自动 hoist jest.mock）。
jest.mock("../src/llm/model.factory", () => ({
  createChatModel: jest.fn(),
}));

const mockCreateChatModel = createChatModel as unknown as jest.Mock;

describe("RequirementResultSchema", () => {
  it("接受合法的结构化结果", () => {
    const value = {
      action: "绑定手机号",
      constraints: ["密码至少8位"],
      entities: ["用户", "手机号", "密码"],
    };
    expect(RequirementResultSchema.parse(value)).toEqual(value);
  });

  it("拒绝缺少字段的对象", () => {
    expect(() => RequirementResultSchema.parse({ action: "x" })).toThrow();
  });

  it("拒绝字段类型错误", () => {
    expect(() =>
      RequirementResultSchema.parse({ action: "x", constraints: "不是数组", entities: [] }),
    ).toThrow();
  });
});

describe("RequirementService", () => {
  it("extract 调用结构化输出并返回结果", async () => {
    const expected = {
      action: "绑定手机号",
      constraints: ["密码至少8位"],
      entities: ["用户", "手机号", "密码"],
    };
    const structured = { invoke: jest.fn().mockResolvedValue(expected) };
    const model = { withStructuredOutput: jest.fn().mockReturnValue(structured) };
    mockCreateChatModel.mockReturnValue(model);

    const service = new RequirementService();
    const result = await service.extract("用户注册时必须绑定手机号，密码至少8位");

    expect(result).toEqual(expected);
    expect(model.withStructuredOutput).toHaveBeenCalledWith(RequirementResultSchema, { method: "jsonMode" });
    expect(structured.invoke).toHaveBeenCalledTimes(1);
  });
});
