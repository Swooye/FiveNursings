import React from "react";
import { List, useTable, EditButton, ShowButton, DeleteButton } from "@refinedev/antd";
import { Table, Space, Tag } from "antd";

export const AdminList = () => {
    const { tableProps } = useTable();

    return (
        <List>
            <Table {...tableProps} rowKey="id">
                <Table.Column dataIndex="id" title="ID" />
                <Table.Column dataIndex="username" title="用户名" />
                <Table.Column dataIndex="email" title="邮箱" />
                <Table.Column 
                    dataIndex="role" 
                    title="角色" 
                    render={(value) => (
                        <Tag color={value === "Super Admin" ? "gold" : "blue"}>
                            {value}
                        </Tag>
                    )}
                />
                <Table.Column dataIndex="nickname" title="昵称" />
                <Table.Column 
                    title="操作"
                    render={(_, record) => (
                        <Space>
                            <EditButton hideText size="small" recordItemId={record.id} />
                            <ShowButton hideText size="small" recordItemId={record.id} />
                            <DeleteButton hideText size="small" recordItemId={record.id} />
                        </Space>
                    )}
                />
            </Table>
        </List>
    );
};
