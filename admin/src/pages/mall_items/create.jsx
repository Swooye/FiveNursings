import React from "react";
import { Create, useForm } from "@refinedev/antd";
import { Form, Input, InputNumber, Select, Radio } from "antd";

export const MallItemCreate = () => {
    const { formProps, saveButtonProps } = useForm();

    return (
        <Create saveButtonProps={saveButtonProps}>
            <Form {...formProps} layout="vertical">
                <Form.Item label="商品名称" name="name" rules={[{ required: true }]}>
                    <Input placeholder="输入商品全名" />
                </Form.Item>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <Form.Item label="分类" name="category" rules={[{ required: true }]}>
                        <Select placeholder="选择分类">
                            <Select.Option value="膏方">膏方</Select.Option>
                            <Select.Option value="滋补">滋补</Select.Option>
                            <Select.Option value="器械">器械</Select.Option>
                            <Select.Option value="药食同源">药食同源</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item label="规格" name="spec">
                        <Input placeholder="如: 500g/瓶" />
                    </Form.Item>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <Form.Item label="售价 (￥)" name="price" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                    <Form.Item label="原价 (￥)" name="originalPrice">
                        <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                    <Form.Item label="库存" name="stock" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                </div>
                <Form.Item label="图片地址" name="imageUrl">
                    <Input placeholder="输入图片 URL" />
                </Form.Item>
                <Form.Item label="上架状态" name="status" initialValue="off_sale">
                    <Radio.Group>
                        <Radio value="on_sale">立即上架</Radio>
                        <Radio value="off_sale">暂不下架</Radio>
                    </Radio.Group>
                </Form.Item>
                <Form.Item label="商品描述" name="description">
                    <Input.TextArea rows={4} />
                </Form.Item>
            </Form>
        </Create>
    );
};
