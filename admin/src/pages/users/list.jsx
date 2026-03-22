import React from "react";
import { List, useTable, EditButton, ShowButton, DeleteButton } from "@refinedev/antd";
import { Table, Space } from "antd";

export const UserList = () => {
    const { tableProps } = useTable({
        syncWithLocation: true,
    });

    return (
        <List>
            <Table {...tableProps} rowKey="id">
                <Table.Column 
                    dataIndex="id" 
                    title="ID" 
                    render={(value) => <span>{value?.toString()}</span>}
                />
                <Table.Column dataIndex="name" title="姓名" />
                <Table.Column dataIndex="nickname" title="昵称" />
                <Table.Column dataIndex="phoneNumber" title="手机号" />
                <Table.Column dataIndex="cancerType" title="癌种" />
                <Table.Column dataIndex="stage" title="康复阶段" />
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
