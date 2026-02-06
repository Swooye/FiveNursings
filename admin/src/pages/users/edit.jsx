import React from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Form, Input } from "antd";

export const UserEdit = () => {
    const { formProps, saveButtonProps } = useForm();

    return (
        <Edit saveButtonProps={saveButtonProps}>
            <Form {...formProps} layout="vertical">
                <Form.Item label="姓名" name="name">
                    <Input />
                </Form.Item>
                <Form.Item label="昵称" name="nickname">
                    <Input />
                </Form.Item>
                <Form.Item label="手机号" name="phoneNumber">
                    <Input />
                </Form.Item>
                <Form.Item label="癌种" name="cancerType">
                    <Input />
                </Form.Item>
                <Form.Item label="康复阶段" name="stage">
                    <Input />
                </Form.Item>
            </Form>
        </Edit>
    );
};
