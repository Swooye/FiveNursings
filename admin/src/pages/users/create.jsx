import React from "react";
import { Create, useForm } from "@refinedev/antd";
import { Form, Input, Select } from "antd";

export const UserCreate = () => {
    const { formProps, saveButtonProps } = useForm();

    return (
        <Create saveButtonProps={saveButtonProps}>
            <Form {...formProps} layout="vertical">
                <Form.Item label="用户名" name="username" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item label="邮箱" name="email" rules={[{ required: true, type: 'email' }]}>
                    <Input />
                </Form.Item>
                <Form.Item label="姓名" name="name">
                    <Input />
                </Form.Item>
                <Form.Item label="手机号" name="phoneNumber">
                    <Input />
                </Form.Item>
                <Form.Item label="癌种" name="cancerType">
                    <Input />
                </Form.Item>
            </Form>
        </Create>
    );
};
