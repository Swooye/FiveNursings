import React from "react";
import { Create, useForm, useSelect } from "@refinedev/antd";
import { Form, Input, Select } from "antd";

export const AdminCreate = () => {
    const { formProps, saveButtonProps } = useForm();

    const { selectProps: roleSelectProps } = useSelect({
        resource: "roles",
        optionLabel: "name",
        optionValue: "name", 
    });

    return (
        <Create saveButtonProps={saveButtonProps}>
            <Form {...formProps} layout="vertical">
                <Form.Item label="用户名" name="username" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item label="邮箱" name="email" rules={[{ required: true, type: 'email' }]}>
                    <Input />
                </Form.Item>
                <Form.Item label="昵称" name="nickname">
                    <Input />
                </Form.Item>
                <Form.Item label="角色" name="role" rules={[{ required: true }]}>
                    <Select {...roleSelectProps} />
                </Form.Item>
                <Form.Item label="密码" name="password" rules={[{ required: true }]}>
                    <Input.Password />
                </Form.Item>
            </Form>
        </Create>
    );
};
