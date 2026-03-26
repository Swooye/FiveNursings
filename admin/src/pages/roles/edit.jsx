import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Form, Input } from "antd";

export const RoleEdit = () => {
    const { formProps, saveButtonProps } = useForm();

    return (
        <Edit saveButtonProps={saveButtonProps}>
            <Form {...formProps} layout="vertical">
                <Form.Item label="角色名称" name="name" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item label="角色标识词 (Key)" name="key" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
            </Form>
        </Edit>
    );
};
