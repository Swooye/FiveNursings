import React, { useState } from "react";
import { Create, useForm } from "@refinedev/antd";
import { Form, Input, InputNumber, Select, Radio, Space, Button, Upload, message } from "antd";
import { MinusCircleOutlined, PlusOutlined } from "@ant-design/icons";

export const MallItemCreate = () => {
    const { formProps, saveButtonProps } = useForm();
    const [fileList, setFileList] = useState([]);

    const handleUpload = async (options) => {
        const { file, onSuccess, onError } = options;
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            onSuccess(data);
            formProps.form.setFieldsValue({ imageUrl: data.url });
            setFileList([{ uid: '-1', name: file.name, status: 'done', url: data.url }]);
            message.success("上传成功");
        } catch (err) {
            onError(err);
            message.error("上传失败");
        }
    };

    return (
        <Create saveButtonProps={saveButtonProps}>
            <Form {...formProps} layout="vertical">
                <Form.Item label="商品名称" name="name" rules={[{ required: true }]}>
                    <Input placeholder="输入商品全名" />
                </Form.Item>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <Form.Item label="分类" name="category" rules={[{ required: true }]}>
                        <Select placeholder="选择分类">
                            <Select.Option value="膏方">膏方</Select.Option>
                            <Select.Option value="滋补">滋补</Select.Option>
                            <Select.Option value="器械">器械</Select.Option>
                            <Select.Option value="药食同源">药食同源</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item label="护理匹配类型" name="nursingType" rules={[{ required: true }]}>
                        <Select placeholder="对应五养类型">
                            <Select.Option value="diet">饮食养</Select.Option>
                            <Select.Option value="exercise">运动养</Select.Option>
                            <Select.Option value="sleep">睡眠养</Select.Option>
                            <Select.Option value="mental">心理养</Select.Option>
                            <Select.Option value="function">功能养</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item label="规格" name="spec" rules={[{ required: true }]}>
                        <Input placeholder="如: 500g/瓶" />
                    </Form.Item>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <Form.Item label="售价" name="price" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                    <Form.Item label="会员价" name="memberPrice" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                    <Form.Item label="库存" name="stock" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                </div>

                <Form.Item label="产品图片">
                    <Upload 
                        customRequest={handleUpload}
                        listType="picture-card"
                        fileList={fileList}
                        maxCount={1}
                        onRemove={() => {
                            formProps.form.setFieldsValue({ imageUrl: "" });
                            setFileList([]);
                        }}
                    >
                        {fileList.length < 1 && (
                            <div>
                                <PlusOutlined />
                                <div style={{ marginTop: 8 }}>上传图片</div>
                            </div>
                        )}
                    </Upload>
                </Form.Item>
                <Form.Item name="imageUrl" hidden><Input /></Form.Item>

                <Form.Item label="专家推荐语" name="reason" rules={[{ required: true }]}>
                    <Input.TextArea rows={2} placeholder="用于详情页 AI Insight 模块展示" />
                </Form.Item>

                {/* 移除初始默认值，改为初始为空数组 */}
                <Form.List name="tags" initialValue={[]}>
                    {(fields, { add, remove }) => (
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>产品标签 (如: 非药物, 草本安神)</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} align="baseline">
                                        <Form.Item {...restField} name={name} rules={[{ required: true, message: '必填' }]} noStyle>
                                            <Input placeholder="标签" style={{ width: '100px' }} />
                                        </Form.Item>
                                        <MinusCircleOutlined onClick={() => remove(name)} />
                                    </Space>
                                ))}
                                <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>添加标签</Button>
                            </div>
                        </div>
                    )}
                </Form.List>

                <Form.List name="highlights" initialValue={[]}>
                    {(fields, { add, remove }) => (
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>产品核心亮点 (逐条展示)</label>
                            {fields.map(({ key, name, ...restField }) => (
                                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                    <Form.Item {...restField} name={name} rules={[{ required: true, message: '必填' }]} noStyle>
                                        <Input placeholder="输入亮点内容" style={{ width: '400px' }} />
                                    </Form.Item>
                                    <MinusCircleOutlined onClick={() => remove(name)} />
                                </Space>
                            ))}
                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>添加亮点</Button>
                        </div>
                    )}
                </Form.List>

                <Form.Item label="建议用法" name="usage" rules={[{ required: true }]}>
                    <Input placeholder="如: 睡前 30 分钟使用或熏香" />
                </Form.Item>

                <Form.Item label="上架状态" name="status" initialValue="off_sale">
                    <Radio.Group>
                        <Radio value="on_sale">立即上架</Radio>
                        <Radio value="off_sale">暂不下架</Radio>
                    </Radio.Group>
                </Form.Item>
            </Form>
        </Create>
    );
};
