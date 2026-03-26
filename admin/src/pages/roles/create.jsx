import React from "react";
import { Create, useForm } from "@refinedev/antd";
import { Form, Input } from "antd";

export const RoleCreate = () => {
    const { formProps, saveButtonProps } = useForm();

    return (
        <Create saveButtonProps={saveButtonProps}>
            <Form {...formProps} layout="vertical">
                <Form.Item label="角色名称" name="name" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item label="角色标识词 (Key)" name="key" rules={[{ required: true }]}>
                    <Input placeholder="例如: manager" />
                </Form.Item>
            </Form>
        </Create>
    );
};
