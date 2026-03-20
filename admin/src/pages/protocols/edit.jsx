import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, DatePicker, Select } from "antd";
import dayjs from "dayjs";

export const ProtocolEdit = () => {
    const { formProps, saveButtonProps, queryResult } = useForm();
    
    return (
        <Edit saveButtonProps={saveButtonProps}>
            <Form {...formProps} layout="vertical">
                <Form.Item
                    label="协议标题"
                    name="title"
                    rules={[{ required: true }]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    label="标识符 (key)"
                    name="key"
                    rules={[{ required: true }]}
                    help="用于系统识别，如 'service_agreement' 或 'privacy_policy'"
                >
                    <Input disabled />
                </Form.Item>
                <Form.Item
                    label="内容"
                    name="content"
                    rules={[{ required: true }]}
                >
                    <Input.TextArea rows={15} />
                </Form.Item>
            </Form>
        </Edit>
    );
};
