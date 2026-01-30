<?php
/**
 * Plugin Name: EDD Data Exporter for Control2Dance (v3)
 * Description: Exporta datos de EDD con búsqueda exhaustiva de IDs de transacción (Stripe/PayPal)
 * Version: 3.0.0
 * Author: Control2Dance
 */

if (!defined('ABSPATH')) exit;

class EDD_Data_Exporter_V3 {
    
    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_post_export_edd_data_v3', [$this, 'handle_export']);
    }
    
    public function add_admin_menu() {
        add_menu_page('EDD Export v3', 'EDD Export v3', 'manage_options', 'edd-data-exporter-v3', [$this, 'admin_page'], 'dashicons-download', 100);
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>📦 Exportar Datos de EDD (v3 - Búsqueda Exhaustiva)</h1>
            <p>Este exportador buscará IDs de transacción en múltiples sitios para asegurar que los links a Stripe y PayPal funcionen.</p>
            <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                <input type="hidden" name="action" value="export_edd_data_v3">
                <?php wp_nonce_field('export_edd_data_v3', 'export_nonce'); ?>
                <?php submit_button('🚀 Generar Exportación Ultra-Completa'); ?>
            </form>
        </div>
        <?php
    }
    
    public function handle_export() {
        if (!current_user_can('manage_options')) wp_die('Permisos insuficientes');
        check_admin_referer('export_edd_data_v3', 'export_nonce');
        
        $export_data = [
            'exported_at' => current_time('mysql'),
            'orders' => $this->export_orders(),
        ];
        
        $json = json_encode($export_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="edd-export-v3-' . date('Y-m-d-His') . '.json"');
        echo $json; exit;
    }
    
    private function export_orders() {
        global $wpdb;
        $data = [];
        
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}edd_orders'");
        
        if ($table_exists) {
            // EDD 3.x
            $orders = $wpdb->get_results("SELECT o.*, c.email as c_email FROM {$wpdb->prefix}edd_orders o LEFT JOIN {$wpdb->prefix}edd_customers c ON o.customer_id = c.id ORDER BY o.id DESC");
            foreach ($orders as $order) {
                $transaction_id = $this->find_transaction_id($order->id, 'order', $order->transaction_id);
                
                $data[] = [
                    'order_number' => $order->order_number,
                    'customer_email' => $order->c_email,
                    'payment_method' => $order->gateway,
                    'transaction_id' => $transaction_id,
                    'status' => $order->status,
                    'total' => $order->total,
                    'created_at' => $order->date_created
                ];
            }
        } else {
            // EDD 2.x
            $orders = get_posts(['post_type' => 'edd_payment', 'posts_per_page' => -1, 'post_status' => 'any']);
            foreach ($orders as $order) {
                $transaction_id = $this->find_transaction_id($order->ID, 'payment', get_post_meta($order->ID, '_edd_payment_transaction_id', true));
                
                $data[] = [
                    'order_number' => get_post_meta($order->ID, '_edd_payment_number', true),
                    'customer_email' => get_post_meta($order->ID, '_edd_payment_user_email', true),
                    'payment_method' => get_post_meta($order->ID, '_edd_payment_gateway', true),
                    'transaction_id' => $transaction_id,
                    'status' => $order->post_status,
                    'total' => get_post_meta($order->ID, '_edd_payment_total', true),
                    'created_at' => $order->post_date
                ];
            }
        }
        return $data;
    }

    private function find_transaction_id($id, $type, $default = '') {
        global $wpdb;
        if (!empty($default)) return $default;

        $meta_table = ($type === 'order') ? "{$wpdb->prefix}edd_ordermeta" : $wpdb->prefix . "postmeta";
        $id_column = ($type === 'order') ? "edd_order_id" : "post_id";

        $keys_to_try = [
            '_edd_payment_transaction_id',
            '_edd_stripe_payment_intent',
            '_edd_stripe_charge_id',
            '_edd_stripe_checkout_session',
            '_paypal_transaction_id',
            'transaction_id',
            'stripe_payment_intent',
            'payment_intent'
        ];

        foreach ($keys_to_try as $key) {
            $val = $wpdb->get_var($wpdb->prepare(
                "SELECT meta_value FROM $meta_table WHERE $id_column = %d AND meta_key = %s", 
                $id, $key
            ));
            if (!empty($val)) return $val;
        }

        // Si no se encuentra mada, intenta buscar en el postmeta original por si acaso (para EDD 3.x migrado)
        if ($type === 'order') {
            foreach ($keys_to_try as $key) {
                // Buscamos si existe un postid asociado a este order_id (a veces guardado en edd_ordermeta)
                $post_id = $wpdb->get_var($wpdb->prepare("SELECT meta_value FROM {$wpdb->prefix}edd_ordermeta WHERE edd_order_id = %d AND meta_key = '_edd_payment_id'", $id));
                if ($post_id) {
                    $val = get_post_meta($post_id, $key, true);
                    if (!empty($val)) return $val;
                }
            }
        }

        return null;
    }
}
new EDD_Data_Exporter_V3();
