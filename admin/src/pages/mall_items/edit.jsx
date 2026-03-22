import React, { useState, useEffect } from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, InputNumber, Select, Radio, Upload, Space, Button, message } from "antd";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import { useParams } from "react-router-dom";

export const MallItemEdit = () => {
    const { id: urlId } = useParams(); // 从路径中精准获取 ID
    const [form] = Form.useForm();
    const { formProps, saveButtonProps, queryResult } = useForm({
        form: form,
        id: urlId, // 显式传递 ID 避免 [object Object]
        redirect: "list"
    });

    const [fileList, setFileList] = useState([]);

    useEffect(() => {
        const item = queryResult?.data?.data;
        if (item) {
            console.log("Loading item data for ID:", urlId, item);
            
            const url = item.imageUrl || item.image;
            if (url) {
                setFileList([{
                    uid: '-1',
                    name: 'image.png',
                    status: 'done',
                    url: url,
                }]);
            }
            
            form.setFieldsValue({
                ...item,
                imageUrl: url,
                tags: item.tags || [],
                highlights: item.highlights || []
            });
        }
    }, [queryResult?.data?.data, form, urlId]);

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
            form.setFieldsValue({ imageUrl: data.url });
            setFileList([{ uid: '-1', name: file.name, status: 'done', url: data.url }]);
            message.success("上传成功");
        } catch (err) {
            onError(err);
            message.error("上传失败");
        }
    };

    return (
        <Edit saveButtonProps={saveButtonProps}>
            <Form {...formProps} form={form} layout="vertical">
                <Form.Item label="商品名称" name="name" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <Form.Item label="分类" name="category" rules={[{ required: true }]}>
                        <Select>
                            <Select.Option value="膏方">膏方</Select.Option>
                            <Select.Option value="滋补">滋补</Select.Option>
                            <Select.Option value="器械">器械</Select.Option>
                            <Select.Option value="药食同源">药食同源</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item label="护理匹配类型" name="nursingType" rules={[{ required: true }]}>
                        <Select>
                            <Select.Option value="diet">饮食养</Select.Option>
                            <Select.Option value="exercise">运动养</Select.Option>
                            <Select.Option value="sleep">睡眠养</Select.Option>
                            <Select.Option value="mental">心理养</Select.Option>
                            <Select.Option value="function">功能养</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item label="规格" name="spec" rules={[{ required: true }]}>
                        <Input />
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
                            form.setFieldsValue({ imageUrl: "" });
                            setFileList([]);
                        }}
                    >
                        {fileList.length < 1 && (
                            <div>
                                <PlusOutlined />
                                <div style={{ marginTop: 8 }}>更换图片</div>
                            </div>
                        )}
                    </Upload>
                </Form.Item>
                <Form.Item name="imageUrl" hidden><Input /></Form.Item>

                <Form.Item label="专家推荐语" name="reason" rules={[{ required: true }]}>
                    <Input.TextArea rows={2} placeholder="用于详情页 AI Insight 模块展示" />
                </Form.Item>

                <Form.List name="tags">
                    {(fields, { add, remove }) => (
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>产品标签</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} align="baseline">
                                        <Form.Item {...restField} name={name} rules={[{ required: true }]} noStyle>
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

                <Form.List name="highlights">
                    {(fields, { add, remove }) => (
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>产品核心亮点</label>
                            {fields.map(({ key, name, ...restField }) => (
                                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                    <Form.Item {...restField} name={name} rules={[{ required: true }]} noStyle>
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
                    <Input />
                </Form.Item>

                <Form.Item label="上架状态" name="status">
                    <Radio.Group>
                        <Radio value="on_sale">售卖中</Radio>
                        <Radio value="off_sale">已下架</Radio>
                    </Radio.Group>
                </Form.Item>
            </Form>
        </Edit>
    );
};
