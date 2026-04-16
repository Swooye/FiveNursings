import React from "react";
import { Create, useForm } from "@refinedev/antd";
import { Form, Input, Select, InputNumber, Button, Space, Card, Divider } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";

const EXPRESS_COMPANIES = [
    "顺丰速运", "圆通速递", "中通快递", "申通快递", "韵达快递",
    "京东物流", "邮政EMS", "德邦物流", "百世快递", "极兔速递"
];

export const OrderCreate = () => {
    const { formProps, saveButtonProps } = useForm();

    return (
        <Create saveButtonProps={saveButtonProps} title="新建订单">
            <Form {...formProps} layout="vertical">
                <Card title="订单基本信息" style={{ marginBottom: 16 }}>
                    <Form.Item label="订单号" name="orderNo" extra="留空将自动生成">
                        <Input placeholder="留空将自动生成（如 KY20260410...）" />
                    </Form.Item>
                    <Form.Item label="支付方式" name="paymentMethod" initialValue="points">
                        <Select options={[
                            { value: "points", label: "积分兑换" },
                            { value: "cash", label: "现金支付" },
                            { value: "mixed", label: "积分+现金" },
                        ]} />
                    </Form.Item>
                    <Form.Item label="订单状态" name="status" initialValue="paid">
                        <Select options={[
                            { value: "pending", label: "待支付" },
                            { value: "paid", label: "已支付" },
                            { value: "processing", label: "处理中" },
                            { value: "shipped", label: "已发货" },
                            { value: "delivered", label: "已签收" },
                        ]} />
                    </Form.Item>
                    <Form.Item label="订单金额（元）" name="totalAmount">
                        <InputNumber min={0} precision={2} style={{ width: "100%" }} placeholder="0.00" />
                    </Form.Item>
                    <Form.Item label="积分数量" name="totalPoints">
                        <InputNumber min={0} style={{ width: "100%" }} placeholder="0" />
                    </Form.Item>
                    <Form.Item label="备注" name="remark">
                        <Input.TextArea rows={2} placeholder="可选备注" />
                    </Form.Item>
                </Card>

                <Card title="客户信息" style={{ marginBottom: 16 }}>
                    <Form.Item label="用户ID" name="userId">
                        <Input placeholder="MongoDB ObjectId 或 Firebase UID" />
                    </Form.Item>
                    <Form.Item label="客户姓名" name="userName">
                        <Input />
                    </Form.Item>
                    <Form.Item label="客户手机" name="userPhone">
                        <Input />
                    </Form.Item>
                </Card>

                <Card title="收货地址" style={{ marginBottom: 16 }}>
                    <Form.Item label="收件人" name={["shippingAddress", "name"]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="手机号" name={["shippingAddress", "phone"]}>
                        <Input />
                    </Form.Item>
                    <Space style={{ width: "100%" }}>
                        <Form.Item label="省份" name={["shippingAddress", "province"]} style={{ flex: 1 }}>
                            <Input />
                        </Form.Item>
                        <Form.Item label="城市" name={["shippingAddress", "city"]} style={{ flex: 1 }}>
                            <Input />
                        </Form.Item>
                        <Form.Item label="区县" name={["shippingAddress", "district"]} style={{ flex: 1 }}>
                            <Input />
                        </Form.Item>
                    </Space>
                    <Form.Item label="详细地址" name={["shippingAddress", "address"]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label="邮编" name={["shippingAddress", "zipCode"]}>
                        <Input />
                    </Form.Item>
                </Card>

                <Card title="快递信息（可选，发货后可补填）" style={{ marginBottom: 16 }}>
                    <Form.Item label="快递公司" name="expressCompany">
                        <Select placeholder="请选择快递公司" showSearch allowClear
                            options={EXPRESS_COMPANIES.map((c) => ({ value: c, label: c }))} />
                    </Form.Item>
                    <Form.Item label="快递单号" name="expressNo">
                        <Input placeholder="如已发货请填入快递单号" />
                    </Form.Item>
                </Card>

                <Card title="商品清单">
                    <Form.List name="items">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} align="start" style={{ marginBottom: 8, flexWrap: "wrap" }}>
                                        <Form.Item {...restField} name={[name, "name"]} rules={[{ required: true, message: "请输入商品名" }]}>
                                            <Input placeholder="商品名称" style={{ width: 180 }} />
                                        </Form.Item>
                                        <Form.Item {...restField} name={[name, "price"]}>
                                            <InputNumber min={0} placeholder="单价(元)" style={{ width: 110 }} />
                                        </Form.Item>
                                        <Form.Item {...restField} name={[name, "points"]}>
                                            <InputNumber min={0} placeholder="积分" style={{ width: 90 }} />
                                        </Form.Item>
                                        <Form.Item {...restField} name={[name, "quantity"]} initialValue={1}>
                                            <InputNumber min={1} placeholder="数量" style={{ width: 80 }} />
                                        </Form.Item>
                                        <MinusCircleOutlined
                                            style={{ marginTop: 8, color: "#ff4d4f", cursor: "pointer" }}
                                            onClick={() => remove(name)}
                                        />
                                    </Space>
                                ))}
                                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                    添加商品行
                                </Button>
                            </>
                        )}
                    </Form.List>
                </Card>
            </Form>
        </Create>
    );
};
